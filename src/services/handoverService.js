/**
 * HandoffHQ — Two-State Persistence & Service Layer (src/services/handoverService.js)
 *
 * Supports two explicit modes:
 * - 'SUPABASE_CONNECTED': Reads/writes directly to Supabase PostgreSQL (`public.handovers`).
 *   Never silently masks a failed cloud write; throws an explicit cloud error so the UI
 *   can notify the user and offer a 1-click switch to LOCAL_DEMO mode.
 * - 'LOCAL_DEMO': Reads/writes to browser `localStorage` ('handoffhq_v1_handovers')
 *   with an in-memory fallback for Node/Vitest test environments.
 */

import {
  supabase,
  isSupabaseConfigured,
  hasUnsafeSupabaseKey,
} from '../lib/supabaseClient.js';
import { evaluateReadiness } from '../lib/readinessEngine.js';
import {
  applyHandoverEdits,
  applyMarkReadyForDelivery,
  applyAcceptHandover,
  applyReturnToSales,
  createActivityLogEntry,
  generateId,
  VALID_ROLES,
} from '../lib/workflowRules.js';
import {
  INITIAL_HANDOVERS,
  DEFAULT_AGENCY_DEPENDENCIES,
  cloneSeedHandovers,
} from '../constants/seedData.js';

export const STORAGE_MODES = {
  SUPABASE_CONNECTED: 'SUPABASE_CONNECTED',
  LOCAL_DEMO: 'LOCAL_DEMO',
};

export const LOCAL_STORAGE_KEY = 'handoffhq_v1_handovers';

let activeStorageMode = isSupabaseConfigured
  ? STORAGE_MODES.SUPABASE_CONNECTED
  : STORAGE_MODES.LOCAL_DEMO;

let memoryFallbackStore = cloneSeedHandovers();

/**
 * Attaches live readiness evaluation to a handover object.
 */
export function attachReadiness(handover) {
  if (!handover) return null;
  return {
    ...handover,
    readiness: evaluateReadiness(handover),
  };
}

/**
 * Reads handovers from browser localStorage (or memory store in Node tests).
 */
export function readLocalHandovers() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryFallbackStore = parsed;
          return parsed;
        }
      }
      const seeded = cloneSeedHandovers();
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seeded));
      memoryFallbackStore = seeded;
      return seeded;
    }
  } catch {
    // Fallback to in-memory store if localStorage is blocked or unavailable
  }
  return JSON.parse(JSON.stringify(memoryFallbackStore));
}

/**
 * Writes handovers array to browser localStorage (and memory fallback store).
 */
export function writeLocalHandovers(handovers) {
  const copy = JSON.parse(JSON.stringify(handovers));
  memoryFallbackStore = copy;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(copy));
    }
  } catch {
    // Ignore quota/storage errors in restricted environments
  }
  return copy;
}

/**
 * Returns the currently active storage mode ('SUPABASE_CONNECTED' or 'LOCAL_DEMO').
 */
export function getStorageMode() {
  return activeStorageMode;
}

/**
 * Explicitly switches the service into LOCAL_DEMO mode (e.g. when requested by user
 * after a mid-session network drop) and persists current handovers locally.
 */
export function switchToLocalMode(currentHandovers = null) {
  activeStorageMode = STORAGE_MODES.LOCAL_DEMO;
  const baseList =
    Array.isArray(currentHandovers) && currentHandovers.length > 0
      ? currentHandovers.map((h) => {
          const copy = { ...h };
          delete copy.readiness;
          return copy;
        })
      : readLocalHandovers();

  const saved = writeLocalHandovers(baseList);
  return {
    mode: activeStorageMode,
    handovers: saved.map(attachReadiness),
  };
}

/**
 * Helper to Strip computed `.readiness` property before DB/storage persistence.
 */
function stripComputedFields(handover) {
  const clean = { ...handover };
  delete clean.readiness;
  return clean;
}

/**
 * Helper to create a clearly flagged cloud write error without silently pretending success.
 */
function createCloudWriteError(operationName, originalError) {
  const detail = originalError?.message || 'Unable to reach Supabase PostgreSQL.';
  const err = new Error(
    `Cloud Save Failed (${operationName}): ${detail} Your changes were NOT saved to Supabase. Retry or switch to Local Demo Mode.`
  );
  err.isCloudWriteError = true;
  err.originalError = originalError;
  return err;
}

/**
 * Initializes persistence and returns all handovers ordered with Acme Website Redesign
 * prominent or by updated_at descending.
 */
export async function initAndListHandovers() {
  if (hasUnsafeSupabaseKey) {
    activeStorageMode = STORAGE_MODES.LOCAL_DEMO;
    const localData = readLocalHandovers();
    return {
      mode: activeStorageMode,
      handovers: localData.map(attachReadiness),
      warning:
        'Security Guard: Unsafe Supabase key detected (service_role/secret key is forbidden in browser code). Switched to LOCAL_DEMO mode.',
    };
  }

  if (activeStorageMode === STORAGE_MODES.SUPABASE_CONNECTED && supabase) {
    try {
      const { data, error } = await supabase
        .from('handovers')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        const seedRows = cloneSeedHandovers();
        const { data: seededData, error: seedError } = await supabase
          .from('handovers')
          .upsert(seedRows, { onConflict: 'id' })
          .select('*');

        if (seedError) {
          throw seedError;
        }

        const finalRows =
          Array.isArray(seededData) && seededData.length > 0
            ? seededData
            : seedRows;
        writeLocalHandovers(finalRows);
        return {
          mode: STORAGE_MODES.SUPABASE_CONNECTED,
          handovers: finalRows.map(attachReadiness),
          warning: null,
        };
      }

      writeLocalHandovers(data);
      return {
        mode: STORAGE_MODES.SUPABASE_CONNECTED,
        handovers: data.map(attachReadiness),
        warning: null,
      };
    } catch (err) {
      activeStorageMode = STORAGE_MODES.LOCAL_DEMO;
      const localData = readLocalHandovers();
      return {
        mode: STORAGE_MODES.LOCAL_DEMO,
        handovers: localData.map(attachReadiness),
        warning: `Supabase connection unavailable (${err?.message || 'network or table error'}). Running in Local Demo Mode (localStorage).`,
      };
    }
  }

  activeStorageMode = STORAGE_MODES.LOCAL_DEMO;
  const localData = readLocalHandovers();
  return {
    mode: STORAGE_MODES.LOCAL_DEMO,
    handovers: localData.map(attachReadiness),
    warning: null,
  };
}

/**
 * Fetches a single handover by ID from the active storage mode.
 */
export async function getHandoverById(id) {
  if (!id) throw new Error('Handover ID is required.');

  if (activeStorageMode === STORAGE_MODES.SUPABASE_CONNECTED && supabase) {
    const { data, error } = await supabase
      .from('handovers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw createCloudWriteError('Fetch Handover', error || new Error('Record not found'));
    }
    return attachReadiness(data);
  }

  const list = readLocalHandovers();
  const found = list.find((h) => h.id === id);
  if (!found) {
    throw new Error(`Handover with ID "${id}" was not found.`);
  }
  return attachReadiness(found);
}

/**
 * Internal helper to fetch current record before applying domain transition rules.
 */
async function loadCurrentHandover(id) {
  if (activeStorageMode === STORAGE_MODES.SUPABASE_CONNECTED && supabase) {
    const { data, error } = await supabase
      .from('handovers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw createCloudWriteError(
        'Read Handover Before Save',
        error || new Error('Handover record not found in Supabase.')
      );
    }
    return data;
  }

  const list = readLocalHandovers();
  const found = list.find((h) => h.id === id);
  if (!found) {
    throw new Error(`Handover with ID "${id}" not found.`);
  }
  return found;
}

/**
 * Internal helper to persist an updated handover record to the active storage mode.
 * Never silently falls back on cloud write failures.
 */
async function persistUpdatedHandover(updatedRecord, operationLabel) {
  const cleanRecord = stripComputedFields(updatedRecord);

  if (activeStorageMode === STORAGE_MODES.SUPABASE_CONNECTED && supabase) {
    try {
      const { data, error } = await supabase
        .from('handovers')
        .update({
          project_name: cleanRecord.project_name,
          client_name: cleanRecord.client_name,
          deal_value: cleanRecord.deal_value,
          target_launch_date: cleanRecord.target_launch_date,
          status: cleanRecord.status,
          scope_summary: cleanRecord.scope_summary,
          sales_owner_name: cleanRecord.sales_owner_name,
          delivery_owner_id: cleanRecord.delivery_owner_id,
          delivery_owner_name: cleanRecord.delivery_owner_name,
          deliverables: cleanRecord.deliverables,
          dependencies: cleanRecord.dependencies,
          document_links: cleanRecord.document_links,
          activity_logs: cleanRecord.activity_logs,
          updated_at: cleanRecord.updated_at,
        })
        .eq('id', cleanRecord.id)
        .select('*')
        .single();

      if (error || !data) {
        throw error || new Error('No row returned from Supabase update.');
      }

      // Mirror successful cloud write to local cache
      const list = readLocalHandovers();
      const nextList = list.map((h) => (h.id === data.id ? data : h));
      writeLocalHandovers(nextList);

      return attachReadiness(data);
    } catch (err) {
      throw createCloudWriteError(operationLabel, err);
    }
  }

  // LOCAL_DEMO mode
  const list = readLocalHandovers();
  const exists = list.some((h) => h.id === cleanRecord.id);
  const nextList = exists
    ? list.map((h) => (h.id === cleanRecord.id ? cleanRecord : h))
    : [cleanRecord, ...list];
  writeLocalHandovers(nextList);

  return attachReadiness(cleanRecord);
}

/**
 * Creates a brand-new handover record (permitted for sales or ops).
 */
export async function createHandover(data, actor) {
  if (!actor || !['sales', 'ops'].includes(actor.role)) {
    throw new Error('Role Permission Denied: Only Sales or Ops personas can create a new handover.');
  }

  const projectName = typeof data?.project_name === 'string' ? data.project_name.trim() : '';
  const clientName = typeof data?.client_name === 'string' ? data.client_name.trim() : '';
  const dealValue = Number(data?.deal_value);
  const targetLaunchDate = data?.target_launch_date || null;

  if (projectName.length < 2) {
    throw new Error('Validation Error: Project name must be at least 2 characters.');
  }
  if (clientName.length < 2) {
    throw new Error('Validation Error: Client name must be at least 2 characters.');
  }
  if (!Number.isFinite(dealValue) || dealValue <= 0) {
    throw new Error('Validation Error: Deal value must be a positive number.');
  }

  const now = new Date().toISOString();
  const initialStatus = data?.initialStatus === 'Draft' ? 'Draft' : 'Blocked';

  const newHandover = {
    id: generateId('00000000'),
    project_name: projectName,
    client_name: clientName,
    deal_value: dealValue,
    target_launch_date: targetLaunchDate,
    status: initialStatus,
    scope_summary: typeof data?.scope_summary === 'string' ? data.scope_summary.trim() : '',
    sales_owner_name: `${actor.name} (${actor.badgeLabel || 'Sales'})`,
    delivery_owner_id: null,
    delivery_owner_name: null,
    deliverables: [],
    dependencies: JSON.parse(JSON.stringify(DEFAULT_AGENCY_DEPENDENCIES)).map((d) => ({
      ...d,
      id: generateId('dep'),
    })),
    document_links: [],
    activity_logs: [
      createActivityLogEntry(
        actor,
        `Created new handover for ${clientName} ($${dealValue.toLocaleString()}). Initialized with standard agency dependency checklist.`,
        now
      ),
    ],
    created_at: now,
    updated_at: now,
  };

  if (activeStorageMode === STORAGE_MODES.SUPABASE_CONNECTED && supabase) {
    try {
      const { data: inserted, error } = await supabase
        .from('handovers')
        .insert([newHandover])
        .select('*')
        .single();

      if (error || !inserted) {
        throw error || new Error('Insert failed.');
      }

      const list = readLocalHandovers();
      writeLocalHandovers([inserted, ...list]);
      return attachReadiness(inserted);
    } catch (err) {
      throw createCloudWriteError('Create Handover', err);
    }
  }

  const list = readLocalHandovers();
  writeLocalHandovers([newHandover, ...list]);
  return attachReadiness(newHandover);
}

/**
 * Saves field/checklist edits to a handover, enforces read-only lock on Handed Over,
 * and auto-downgrades Ready for Delivery -> Blocked if any gate is broken.
 */
export async function saveHandoverChanges(id, updates, logAction, actor) {
  const current = await loadCurrentHandover(id);
  const updated = applyHandoverEdits(current, updates, logAction, actor);
  return persistUpdatedHandover(updated, 'Save Changes');
}

/**
 * Marks a handover Ready for Delivery (requires 6/6 gates and sales/ops role).
 */
export async function markReadyForDelivery(id, actor) {
  const current = await loadCurrentHandover(id);
  const updated = applyMarkReadyForDelivery(current, actor);
  return persistUpdatedHandover(updated, 'Mark Ready for Delivery');
}

/**
 * Accepts a Ready for Delivery handover into Handed Over (requires 6/6 gates and delivery/ops role).
 */
export async function acceptHandover(id, actor, note = '') {
  const current = await loadCurrentHandover(id);
  const updated = applyAcceptHandover(current, actor, note);
  return persistUpdatedHandover(updated, 'Accept Handover');
}

/**
 * Sends a Ready for Delivery handover back to Sales as Blocked (requires reason >= 5 chars and delivery/ops role).
 */
export async function returnToSales(id, actor, reason) {
  const current = await loadCurrentHandover(id);
  const updated = applyReturnToSales(current, actor, reason);
  return persistUpdatedHandover(updated, 'Send Back to Sales');
}

/**
 * Restores all 4 pre-seeded agency handovers (including "Acme Website Redesign" at 3/6 Blocked)
 * using deterministic fixed-UUID upsert in Supabase and resetting localStorage.
 */
export async function resetDemoData() {
  const freshSeed = cloneSeedHandovers();

  if (activeStorageMode === STORAGE_MODES.SUPABASE_CONNECTED && supabase) {
    try {
      const { data, error } = await supabase
        .from('handovers')
        .upsert(freshSeed, { onConflict: 'id' })
        .select('*');

      if (error) {
        throw error;
      }

      const restored =
        Array.isArray(data) && data.length > 0 ? data : freshSeed;
      writeLocalHandovers(restored);
      return {
        mode: STORAGE_MODES.SUPABASE_CONNECTED,
        handovers: restored.map(attachReadiness),
      };
    } catch (err) {
      throw createCloudWriteError('Reset Demo Data', err);
    }
  }

  const saved = writeLocalHandovers(freshSeed);
  return {
    mode: STORAGE_MODES.LOCAL_DEMO,
    handovers: saved.map(attachReadiness),
  };
}

export { INITIAL_HANDOVERS, VALID_ROLES };

