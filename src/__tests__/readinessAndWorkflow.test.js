import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateReadiness,
  isValidHttpUrl,
  isValidDateString,
  getNonWhitespaceLength,
} from '../lib/readinessEngine.js';
import {
  applyHandoverEdits,
  applyMarkReadyForDelivery,
  applyAcceptHandover,
  applyReturnToSales,
  canPerformAction,
} from '../lib/workflowRules.js';
import {
  DEMO_USERS,
  DELIVERY_OWNERS,
} from '../constants/demoUsers.js';
import {
  INITIAL_HANDOVERS,
  ACME_SAMPLE_SCOPE,
  cloneSeedHandovers,
} from '../constants/seedData.js';
import {
  initAndListHandovers,
  createHandover,
  saveHandoverChanges,
  markReadyForDelivery,
  acceptHandover,
  returnToSales,
  resetDemoData,
  switchToLocalMode,
  STORAGE_MODES,
} from '../services/handoverService.js';
import { isUnsafeKey } from '../lib/supabaseClient.js';

const salesUser = DEMO_USERS.find((u) => u.role === 'sales'); // Aarav Mehta
const deliveryUser = DEMO_USERS.find((u) => u.role === 'delivery'); // Priya Nair
const opsUser = DEMO_USERS.find((u) => u.role === 'ops'); // Vikram Desai

describe('HandoffHQ — Six-Gate Deterministic Readiness Engine', () => {
  it('evaluates the same input deterministically every time', () => {
    const acme = cloneSeedHandovers()[0];
    const result1 = evaluateReadiness(acme);
    const result2 = evaluateReadiness(acme);
    expect(result1).toEqual(result2);
  });

  it('verifies seeded handovers match the exact blueprint readiness states', () => {
    const seeds = cloneSeedHandovers();
    expect(seeds).toHaveLength(4);

    // 1. Acme Website Redesign: Blocked, 3/6 passed (R-01, R-03, R-05 pass; R-02, R-04, R-06 fail)
    const acmeEval = evaluateReadiness(seeds[0]);
    expect(seeds[0].project_name).toBe('Acme Website Redesign');
    expect(seeds[0].status).toBe('Blocked');
    expect(acmeEval.passedCount).toBe(3);
    expect(acmeEval.percentage).toBe(50);
    expect(acmeEval.isReady).toBe(false);
    expect(acmeEval.blockers.map((b) => b.id)).toEqual(['R-02', 'R-04', 'R-06']);

    // 2. FinPulse Mobile App MVP: Ready for Delivery, 6/6 passed
    const finEval = evaluateReadiness(seeds[1]);
    expect(seeds[1].status).toBe('Ready for Delivery');
    expect(finEval.passedCount).toBe(6);
    expect(finEval.percentage).toBe(100);
    expect(finEval.isReady).toBe(true);

    // 3. Nexus B2B SEO & Content Retainer: Handed Over, 6/6 passed
    const nexusEval = evaluateReadiness(seeds[2]);
    expect(seeds[2].status).toBe('Handed Over');
    expect(nexusEval.passedCount).toBe(6);
    expect(nexusEval.isReady).toBe(true);

    // 4. VoltEdge Shopify Plus Migration: Blocked, 2/6 passed
    const voltEval = evaluateReadiness(seeds[3]);
    expect(seeds[3].status).toBe('Blocked');
    expect(voltEval.passedCount).toBe(2);
    expect(voltEval.isReady).toBe(false);
  });

  it('validates Gate R-01 (Commercial & Timeline Baseline)', () => {
    const base = cloneSeedHandovers()[1]; // Starts 6/6 passing

    expect(evaluateReadiness({ ...base, client_name: ' ' }).gates[0].passed).toBe(false);
    expect(evaluateReadiness({ ...base, deal_value: 0 }).gates[0].passed).toBe(false);
    expect(evaluateReadiness({ ...base, deal_value: -500 }).gates[0].passed).toBe(false);
    expect(evaluateReadiness({ ...base, target_launch_date: '' }).gates[0].passed).toBe(false);
    expect(evaluateReadiness({ ...base, target_launch_date: '2026-02-30' }).gates[0].passed).toBe(false);
    expect(isValidDateString('2026-12-15')).toBe(true);
    expect(isValidDateString('2026-02-29')).toBe(false);
  });

  it('validates Gate R-02 (Scope Clarity: >= 30 non-whitespace characters)', () => {
    const base = cloneSeedHandovers()[1];

    // Short scope fails
    expect(evaluateReadiness({ ...base, scope_summary: 'Short scope' }).gates[1].passed).toBe(false);

    // Padded whitespace that looks >= 30 chars total but has < 30 non-whitespace chars MUST fail
    const paddedFakeScope = 'abc' + ' '.repeat(40) + 'def';
    expect(getNonWhitespaceLength(paddedFakeScope)).toBe(6);
    expect(evaluateReadiness({ ...base, scope_summary: paddedFakeScope }).gates[1].passed).toBe(false);

    // 30+ non-whitespace characters passes
    expect(evaluateReadiness({ ...base, scope_summary: ACME_SAMPLE_SCOPE }).gates[1].passed).toBe(true);
  });

  it('validates Gate R-03 (Defined Deliverables: >= 2 items with valid title and due date)', () => {
    const base = cloneSeedHandovers()[1];

    // Only 1 deliverable fails
    expect(
      evaluateReadiness({
        ...base,
        deliverables: [{ id: '1', title: 'Single Deliverable', due_date: '2026-11-20' }],
      }).gates[2].passed
    ).toBe(false);

    // 2 deliverables but one has missing due_date fails
    expect(
      evaluateReadiness({
        ...base,
        deliverables: [
          { id: '1', title: 'Deliverable One', due_date: '2026-11-20' },
          { id: '2', title: 'Deliverable Two', due_date: '' },
        ],
      }).gates[2].passed
    ).toBe(false);

    // 2 deliverables with valid titles and dates passes
    expect(evaluateReadiness(base).gates[2].passed).toBe(true);
  });

  it('validates Gate R-04 (Dependency Readiness: >= 1 mandatory, meaningful titles, all mandatory resolved)', () => {
    const base = cloneSeedHandovers()[1];

    // 1. No dependencies at all fails R-04
    expect(
      evaluateReadiness({
        ...base,
        dependencies: [],
      }).gates[3].passed
    ).toBe(false);

    // 2. Deleting all mandatory dependencies (leaving only optional) fails R-04
    expect(
      evaluateReadiness({
        ...base,
        dependencies: [
          { id: 'opt-1', title: 'Optional Item', is_mandatory: false, is_resolved: true },
        ],
      }).gates[3].passed
    ).toBe(false);

    // 3. Unresolved mandatory dependency fails R-04
    expect(
      evaluateReadiness({
        ...base,
        dependencies: [
          { id: 'm-1', title: 'DNS Credentials', is_mandatory: true, is_resolved: false },
        ],
      }).gates[3].passed
    ).toBe(false);

    // 4. Malformed mandatory dependency (empty/whitespace/missing title) blocks R-04 even if resolved and paired with a valid resolved mandatory dependency
    expect(
      evaluateReadiness({
        ...base,
        dependencies: [
          { id: 'm-1', title: 'DNS Credentials', is_mandatory: true, is_resolved: true },
          { id: 'm-2', title: '   ', is_mandatory: true, is_resolved: true },
        ],
      }).gates[3].passed
    ).toBe(false);

    expect(
      evaluateReadiness({
        ...base,
        dependencies: [
          { id: 'm-1', title: null, is_mandatory: true, is_resolved: true },
        ],
      }).gates[3].passed
    ).toBe(false);

    // 5. Mandatory resolved with meaningful title + optional unresolved passes R-04
    expect(
      evaluateReadiness({
        ...base,
        dependencies: [
          { id: 'm-1', title: 'DNS Credentials', is_mandatory: true, is_resolved: true },
          { id: 'o-1', title: 'Optional Analytics', is_mandatory: false, is_resolved: false },
        ],
      }).gates[3].passed
    ).toBe(true);
  });

  it('validates Gate R-05 (Supporting Documentation: passes when >= 1 doc has valid label & HTTP/HTTPS URL)', () => {
    const base = cloneSeedHandovers()[1];

    expect(isValidHttpUrl('https://notion.so/acme-sow')).toBe(true);
    expect(isValidHttpUrl('http://example.com/spec.pdf')).toBe(true);
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isValidHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isValidHttpUrl('ftp://files.acme.com/doc')).toBe(false);
    expect(isValidHttpUrl('not-a-url')).toBe(false);

    // 1. No documents -> fails R-05
    expect(
      evaluateReadiness({ ...base, document_links: [] }).gates[4].passed
    ).toBe(false);

    // 2. All-invalid documents -> fails R-05
    expect(
      evaluateReadiness({
        ...base,
        document_links: [
          { id: '1', label: 'Signed SOW', url: 'javascript:alert(1)' },
          { id: '2', label: '   ', url: 'https://notion.so/valid-url-empty-label' },
          { id: '3', label: 'Broken Link', url: 'not-a-valid-url' },
        ],
      }).gates[4].passed
    ).toBe(false);

    // 3. One valid document -> passes R-05
    expect(
      evaluateReadiness({
        ...base,
        document_links: [
          { id: '1', label: 'Signed SOW', url: 'https://notion.so/acme-sow' },
        ],
      }).gates[4].passed
    ).toBe(true);

    // 4. One valid document PLUS one invalid document -> still passes R-05
    expect(
      evaluateReadiness({
        ...base,
        document_links: [
          { id: '1', label: 'Signed SOW', url: 'https://notion.so/acme-sow' },
          { id: '2', label: 'Draft Link', url: 'not-a-valid-url' },
          { id: '3', label: '', url: 'https://example.com/missing-label' },
        ],
      }).gates[4].passed
    ).toBe(true);
  });

  it('validates Gate R-06 (Delivery Ownership: requires assigned delivery owner)', () => {
    const base = cloneSeedHandovers()[1];

    expect(
      evaluateReadiness({ ...base, delivery_owner_id: null, delivery_owner_name: null }).gates[5].passed
    ).toBe(false);

    expect(evaluateReadiness(base).gates[5].passed).toBe(true);
  });
});

describe('HandoffHQ — Role Restrictions, State Transitions & Invalidation Downgrade', () => {
  it('blocks marking Ready for Delivery when any of the 6 gates fail', () => {
    const acmeBlocked = cloneSeedHandovers()[0]; // 3/6 gates
    expect(() => applyMarkReadyForDelivery(acmeBlocked, salesUser)).toThrow(
      /Readiness Gate Failure/
    );
  });

  it('enforces role permissions on Mark Ready for Delivery and Accept Handover', () => {
    const readyDeal = cloneSeedHandovers()[1]; // FinPulse, 6/6, status 'Ready for Delivery'
    const allGatesPassedBlocked = { ...readyDeal, status: 'Blocked' };

    // Delivery cannot mark Ready for Delivery
    expect(canPerformAction('MARK_READY', allGatesPassedBlocked, deliveryUser)).toBe(false);
    expect(() => applyMarkReadyForDelivery(allGatesPassedBlocked, deliveryUser)).toThrow(
      /Only Sales or Ops personas/
    );

    // Sales CAN mark Ready for Delivery when 6/6 pass
    expect(canPerformAction('MARK_READY', allGatesPassedBlocked, salesUser)).toBe(true);
    const markedReady = applyMarkReadyForDelivery(allGatesPassedBlocked, salesUser);
    expect(markedReady.status).toBe('Ready for Delivery');

    // Sales CANNOT accept a handover into Delivery execution
    expect(canPerformAction('ACCEPT_HANDOVER', markedReady, salesUser)).toBe(false);
    expect(() => applyAcceptHandover(markedReady, salesUser)).toThrow(
      /Only Delivery or Ops personas/
    );

    // Sales CANNOT send back a handover
    expect(() => applyReturnToSales(markedReady, salesUser, 'Need better scope')).toThrow(
      /Only Delivery or Ops personas/
    );

    // Delivery CAN accept a Ready for Delivery handover
    expect(canPerformAction('ACCEPT_HANDOVER', markedReady, deliveryUser)).toBe(true);
    const accepted = applyAcceptHandover(markedReady, deliveryUser, 'Kickoff scheduled for Monday');
    expect(accepted.status).toBe('Handed Over');
  });

  it('automatically downgrades a Ready for Delivery handover to Blocked if an edit breaks a gate', () => {
    const readyDeal = cloneSeedHandovers()[1]; // FinPulse: Ready for Delivery (6/6)
    expect(readyDeal.status).toBe('Ready for Delivery');

    // Edit scope_summary to be too short -> breaks R-02
    const downgraded = applyHandoverEdits(
      readyDeal,
      { scope_summary: 'Too short' },
      'Edited scope summary',
      salesUser
    );

    expect(downgraded.status).toBe('Blocked');
    expect(downgraded.activity_logs[0].action).toMatch(
      /Auto-downgraded status from Ready for Delivery to Blocked/
    );
    expect(downgraded.activity_logs[0].action).toMatch(/R-02/);
  });

  it('requires a valid reason when Delivery or Ops sends a handover back to Sales', () => {
    const readyDeal = cloneSeedHandovers()[1];

    // Empty or < 5 char reason is rejected
    expect(() => applyReturnToSales(readyDeal, deliveryUser, 'no')).toThrow(
      /at least 5 characters/
    );

    const returned = applyReturnToSales(
      readyDeal,
      deliveryUser,
      'Missing staging API rate-limit documentation in SOW'
    );
    expect(returned.status).toBe('Blocked');
    expect(returned.activity_logs[0].action).toContain(
      'Missing staging API rate-limit documentation in SOW'
    );
  });

  it('enforces role-based editing: Sales and Ops can edit non-Handed-Over deals, while Delivery cannot edit fields', async () => {
    await resetDemoData();
    const blockedDeal = cloneSeedHandovers()[0]; // Acme: Blocked
    const readyDeal = cloneSeedHandovers()[1]; // FinPulse: Ready for Delivery

    // Sales and Ops are permitted to edit non-Handed-Over handovers
    expect(canPerformAction('EDIT', blockedDeal, salesUser)).toBe(true);
    expect(canPerformAction('EDIT', blockedDeal, opsUser)).toBe(true);
    expect(canPerformAction('EDIT', readyDeal, salesUser)).toBe(true);
    expect(canPerformAction('EDIT', readyDeal, opsUser)).toBe(true);

    // Delivery is NOT permitted to edit handover fields in any status
    expect(canPerformAction('EDIT', { ...blockedDeal, status: 'Draft' }, deliveryUser)).toBe(false);
    expect(canPerformAction('EDIT', blockedDeal, deliveryUser)).toBe(false);
    expect(canPerformAction('EDIT', readyDeal, deliveryUser)).toBe(false);

    // Domain layer rejects edits by Delivery
    expect(() =>
      applyHandoverEdits(
        blockedDeal,
        { scope_summary: ACME_SAMPLE_SCOPE },
        'Delivery attempted to edit scope',
        deliveryUser
      )
    ).toThrow(/Only Sales or Ops personas can edit/);

    expect(() =>
      applyHandoverEdits(
        readyDeal,
        { deal_value: 95000 },
        'Delivery attempted to edit deal value',
        deliveryUser
      )
    ).toThrow(/Only Sales or Ops personas can edit/);

    // Service layer rejects edits by Delivery
    await expect(
      saveHandoverChanges(
        blockedDeal.id,
        { scope_summary: ACME_SAMPLE_SCOPE },
        'Unauthorized service edit by Delivery',
        deliveryUser
      )
    ).rejects.toThrow(/Only Sales or Ops personas can edit/);
  });

  it('enforces read-only lock once a handover is Handed Over', () => {
    const handedOverDeal = cloneSeedHandovers()[2]; // Nexus B2B: Handed Over
    expect(handedOverDeal.status).toBe('Handed Over');

    expect(canPerformAction('EDIT', handedOverDeal, salesUser)).toBe(false);
    expect(canPerformAction('EDIT', handedOverDeal, opsUser)).toBe(false);
    expect(canPerformAction('EDIT', handedOverDeal, deliveryUser)).toBe(false);

    expect(() =>
      applyHandoverEdits(
        handedOverDeal,
        { scope_summary: 'Attempting unauthorized post-handoff scope change' },
        'Tried editing scope',
        salesUser
      )
    ).toThrow(/Locked Record/);
  });

  it('completes the full 60-second Acme Website Redesign demo flow and resets cleanly via handoverService', async () => {
    await resetDemoData();
    const init = await initAndListHandovers();
    const acme = init.handovers.find((h) => h.project_name === 'Acme Website Redesign');
    expect(acme.status).toBe('Blocked');
    expect(acme.readiness.passedCount).toBe(3);

    // Resolve R-02 (scope), R-04 (dependency), and R-06 (delivery owner)
    const resolvedDependencies = acme.dependencies.map((d) => ({
      ...d,
      is_resolved: true,
    }));
    const priyaOwner = DELIVERY_OWNERS[0];

    const afterEdits = await saveHandoverChanges(
      acme.id,
      {
        scope_summary: ACME_SAMPLE_SCOPE,
        dependencies: resolvedDependencies,
        delivery_owner_id: priyaOwner.id,
        delivery_owner_name: priyaOwner.name,
      },
      'Resolved Scope Summary, DNS/Webflow Access, and assigned Priya Nair',
      salesUser
    );

    expect(afterEdits.readiness.passedCount).toBe(6);
    expect(afterEdits.readiness.isReady).toBe(true);

    // Mark Ready for Delivery as Sales (Aarav)
    const readyAcme = await markReadyForDelivery(acme.id, salesUser);
    expect(readyAcme.status).toBe('Ready for Delivery');

    // Accept Handover as Delivery (Priya)
    const handedOverAcme = await acceptHandover(acme.id, deliveryUser);
    expect(handedOverAcme.status).toBe('Handed Over');

    // Verify locked against further edits
    await expect(
      saveHandoverChanges(acme.id, { deal_value: 99999 }, 'Post-lock edit', salesUser)
    ).rejects.toThrow(/Locked Record/);

    // Verify 1-click Demo Reset restores Acme to Blocked (3/6)
    const resetResult = await resetDemoData();
    const resetAcme = resetResult.handovers.find(
      (h) => h.project_name === 'Acme Website Redesign'
    );
    expect(resetAcme.status).toBe('Blocked');
    expect(resetAcme.readiness.passedCount).toBe(3);
  });

  it('transitions Draft handovers to Blocked when evaluated with < 6 gates, or to Ready for Delivery when 6/6 pass', () => {
    const draftIncomplete = { ...cloneSeedHandovers()[0], status: 'Draft' };
    const editedDraft = applyHandoverEdits(
      draftIncomplete,
      { deal_value: 48000 },
      'Updated deal value on draft',
      salesUser
    );
    expect(editedDraft.status).toBe('Blocked');

    const draftComplete = { ...cloneSeedHandovers()[1], status: 'Draft' };
    const readyFromDraft = applyMarkReadyForDelivery(draftComplete, opsUser);
    expect(readyFromDraft.status).toBe('Ready for Delivery');
  });

  it('enforces role checks and field validation when creating a new handover', async () => {
    await expect(
      createHandover(
        {
          project_name: 'Unauthorized Deal',
          client_name: 'Test Client',
          deal_value: 25000,
          target_launch_date: '2026-12-15',
        },
        deliveryUser
      )
    ).rejects.toThrow(/Only Sales or Ops/);

    await expect(
      createHandover(
        {
          project_name: 'Valid Project',
          client_name: 'Valid Client',
          deal_value: 0,
          target_launch_date: '2026-12-15',
        },
        salesUser
      )
    ).rejects.toThrow(/positive number/);

    const created = await createHandover(
      {
        project_name: 'Cloud Migration Phase 1',
        client_name: 'Orbit Logistics',
        deal_value: 54000,
        target_launch_date: '2026-12-22',
      },
      salesUser
    );
    expect(created.status).toBe('Blocked');
    expect(created.dependencies.filter((d) => d.is_mandatory).length).toBeGreaterThanOrEqual(1);
    expect(created.readiness.passedCount).toBe(1); // R-01 passes initially
  });

  it('detects and blocks unsafe Supabase service_role or secret keys and supports explicit LOCAL_DEMO switching', () => {
    expect(isUnsafeKey('sb_secret_123456789')).toBe(true);
    expect(isUnsafeKey('eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig')).toBe(true);
    expect(isUnsafeKey('eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.sig')).toBe(false);

    const switched = switchToLocalMode();
    expect(switched.mode).toBe(STORAGE_MODES.LOCAL_DEMO);
    expect(switched.handovers.length).toBeGreaterThanOrEqual(4);
  });
});
