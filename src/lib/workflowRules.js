/**
 * HandoffHQ — Pure Workflow & State-Transition Rules (src/lib/workflowRules.js)
 *
 * Enforces lifecycle transitions, role permissions, read-only locking on
 * 'Handed Over', and automatic downgrade from 'Ready for Delivery' to 'Blocked'
 * whenever an edit invalidates any of the 6 readiness gates.
 */

import { evaluateReadiness } from './readinessEngine.js';

export const VALID_STATUSES = [
  'Draft',
  'Blocked',
  'Ready for Delivery',
  'Handed Over',
];

export const VALID_ROLES = ['sales', 'delivery', 'ops'];

/**
 * Generates a unique ID for checklist items or activity logs.
 */
export function generateId(prefix = 'item') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Creates a standardized activity log entry.
 */
export function createActivityLogEntry(actor, action, timestamp = new Date().toISOString()) {
  const actorName = actor?.name?.trim() || 'System';
  const actorRole = VALID_ROLES.includes(actor?.role) ? actor.role : 'ops';

  return {
    id: generateId('act'),
    actor_name: actorName,
    actor_role: actorRole,
    action: action.trim(),
    timestamp,
  };
}

/**
 * Prepends an activity log entry while keeping the array within the 100-item DB bound.
 */
export function prependActivityLog(existingLogs, newEntry) {
  const logs = Array.isArray(existingLogs) ? existingLogs : [];
  return [newEntry, ...logs].slice(0, 100);
}

/**
 * Pure helper to check whether a persona role is permitted to perform an action.
 */
export function canPerformAction(actionType, handover, actor) {
  const role = actor?.role;
  if (!VALID_ROLES.includes(role) || !handover) return false;

  const readiness = evaluateReadiness(handover);

  switch (actionType) {
    case 'EDIT':
      return (
        handover.status !== 'Handed Over' &&
        (role === 'sales' || role === 'ops')
      );
    case 'MARK_READY':
      return (
        (handover.status === 'Blocked' || handover.status === 'Draft') &&
        readiness.isReady &&
        (role === 'sales' || role === 'ops')
      );
    case 'ACCEPT_HANDOVER':
      return (
        handover.status === 'Ready for Delivery' &&
        readiness.isReady &&
        (role === 'delivery' || role === 'ops')
      );
    case 'RETURN_TO_SALES':
      return (
        handover.status === 'Ready for Delivery' &&
        (role === 'delivery' || role === 'ops')
      );
    default:
      return false;
  }
}

/**
 * Validates and applies edits to a handover record.
 * - Rejects any edit if the handover is 'Handed Over' (locked read-only state).
 * - Automatically downgrades 'Ready for Delivery' -> 'Blocked' if an edit causes
 *   any of the 6 readiness gates to fail.
 * - Transitions 'Draft' -> 'Blocked' once evaluated if < 6 gates pass.
 */
export function applyHandoverEdits(currentHandover, updates, logAction, actor) {
  if (!currentHandover) {
    throw new Error('Handover record is required.');
  }

  if (currentHandover.status === 'Handed Over') {
    throw new Error(
      'Locked Record: Handovers in "Handed Over" status are read-only and cannot be modified.'
    );
  }

  if (!actor || !['sales', 'ops'].includes(actor.role)) {
    throw new Error(
      'Role Permission Denied: Only Sales or Ops personas can edit handover fields and checklists.'
    );
  }

  // Prevent callers from smuggling an illegal status transition through field edits
  const sanitizedUpdates = { ...updates };
  delete sanitizedUpdates.status;
  delete sanitizedUpdates.id;

  const updatedHandover = {
    ...currentHandover,
    ...sanitizedUpdates,
  };

  if (
    typeof updatedHandover.project_name !== 'string' ||
    updatedHandover.project_name.trim().length === 0
  ) {
    throw new Error('Project name cannot be empty.');
  }

  if (
    typeof updatedHandover.client_name !== 'string' ||
    updatedHandover.client_name.trim().length < 2
  ) {
    throw new Error('Client name must be at least 2 characters.');
  }

  const readiness = evaluateReadiness(updatedHandover);
  const now = new Date().toISOString();

  let nextStatus = currentHandover.status;
  let finalLogMessage = logAction?.trim() || 'Updated handover details.';

  // Auto-Downgrade Guard: Ready for Delivery -> Blocked if any gate fails
  if (currentHandover.status === 'Ready for Delivery' && !readiness.isReady) {
    nextStatus = 'Blocked';
    const failedGateIds = readiness.blockers.map((b) => b.id).join(', ');
    finalLogMessage = `${finalLogMessage} — Auto-downgraded status from Ready for Delivery to Blocked because gate(s) failed (${failedGateIds}).`;
  } else if (currentHandover.status === 'Draft' && !readiness.isReady) {
    nextStatus = 'Blocked';
  }

  const logEntry = createActivityLogEntry(actor, finalLogMessage, now);

  return {
    ...updatedHandover,
    status: nextStatus,
    activity_logs: prependActivityLog(currentHandover.activity_logs, logEntry),
    updated_at: now,
  };
}

/**
 * Transitions a handover from 'Draft' or 'Blocked' -> 'Ready for Delivery'.
 * Enforces:
 * 1. Role must be 'sales' or 'ops'
 * 2. Current status must be 'Draft' or 'Blocked'
 * 3. All 6 readiness gates must pass (6/6 = 100%)
 */
export function applyMarkReadyForDelivery(currentHandover, actor) {
  if (!currentHandover) {
    throw new Error('Handover record is required.');
  }

  if (!actor || !['sales', 'ops'].includes(actor.role)) {
    throw new Error(
      'Role Permission Denied: Only Sales or Ops personas can mark a handover Ready for Delivery.'
    );
  }

  if (currentHandover.status === 'Handed Over') {
    throw new Error('Cannot modify a handover that is already Handed Over.');
  }

  if (currentHandover.status === 'Ready for Delivery') {
    throw new Error('Handover is already marked Ready for Delivery.');
  }

  const readiness = evaluateReadiness(currentHandover);
  if (!readiness.isReady) {
    const failedList = readiness.blockers.map((b) => `${b.id} (${b.title})`).join(', ');
    throw new Error(
      `Readiness Gate Failure (${readiness.passedCount}/6 passed): Cannot mark Ready for Delivery while blockers remain: ${failedList}.`
    );
  }

  const now = new Date().toISOString();
  const logEntry = createActivityLogEntry(
    actor,
    'Marked handover Ready for Delivery (6/6 readiness gates passed).',
    now
  );

  return {
    ...currentHandover,
    status: 'Ready for Delivery',
    activity_logs: prependActivityLog(currentHandover.activity_logs, logEntry),
    updated_at: now,
  };
}

/**
 * Transitions a handover from 'Ready for Delivery' -> 'Handed Over'.
 * Enforces:
 * 1. Role must be 'delivery' or 'ops'
 * 2. Current status must be 'Ready for Delivery'
 * 3. All 6 readiness gates must still pass (6/6 = 100%)
 */
export function applyAcceptHandover(currentHandover, actor, note = '') {
  if (!currentHandover) {
    throw new Error('Handover record is required.');
  }

  if (!actor || !['delivery', 'ops'].includes(actor.role)) {
    throw new Error(
      'Role Permission Denied: Only Delivery or Ops personas can accept a handover into execution.'
    );
  }

  if (currentHandover.status !== 'Ready for Delivery') {
    throw new Error(
      `Invalid State Transition: Handover must be in "Ready for Delivery" status before acceptance (current status: "${currentHandover.status}").`
    );
  }

  const readiness = evaluateReadiness(currentHandover);
  if (!readiness.isReady) {
    throw new Error(
      `Readiness Gate Failure (${readiness.passedCount}/6 passed): Cannot accept a handover with unresolved blockers.`
    );
  }

  const now = new Date().toISOString();
  const cleanNote = typeof note === 'string' ? note.trim() : '';
  const actionText = cleanNote
    ? `Accepted handover into Delivery execution. Transition marked Handed Over. Note: "${cleanNote}"`
    : 'Accepted handover into Delivery execution. Transition marked Handed Over.';

  const logEntry = createActivityLogEntry(actor, actionText, now);

  return {
    ...currentHandover,
    status: 'Handed Over',
    activity_logs: prependActivityLog(currentHandover.activity_logs, logEntry),
    updated_at: now,
  };
}

/**
 * Transitions a handover from 'Ready for Delivery' -> 'Blocked' (Send Back to Sales).
 * Enforces:
 * 1. Role must be 'delivery' or 'ops'
 * 2. Current status must be 'Ready for Delivery'
 * 3. A non-empty rejection reason (>= 5 characters) is required
 */
export function applyReturnToSales(currentHandover, actor, reason) {
  if (!currentHandover) {
    throw new Error('Handover record is required.');
  }

  if (!actor || !['delivery', 'ops'].includes(actor.role)) {
    throw new Error(
      'Role Permission Denied: Only Delivery or Ops personas can send a handover back to Sales.'
    );
  }

  if (currentHandover.status !== 'Ready for Delivery') {
    throw new Error(
      `Invalid State Transition: Only handovers in "Ready for Delivery" status can be sent back to Sales (current status: "${currentHandover.status}").`
    );
  }

  const cleanReason = typeof reason === 'string' ? reason.trim() : '';
  if (cleanReason.length < 5) {
    throw new Error(
      'Validation Error: Please provide a clear reason (at least 5 characters) when sending a handover back to Sales.'
    );
  }

  const now = new Date().toISOString();
  const logEntry = createActivityLogEntry(
    actor,
    `Sent handover back to Sales (Status reverted to Blocked). Reason: "${cleanReason}"`,
    now
  );

  return {
    ...currentHandover,
    status: 'Blocked',
    activity_logs: prependActivityLog(currentHandover.activity_logs, logEntry),
    updated_at: now,
  };
}

