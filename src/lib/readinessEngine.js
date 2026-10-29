/**
 * HandoffHQ — Deterministic 6-Gate Readiness Engine (src/lib/readinessEngine.js)
 *
 * Pure, zero-dependency domain logic. Given the same handover input,
 * evaluateReadiness(handover) always returns the exact same output.
 */

/**
 * Validates that a value is a well-formed HTTP or HTTPS URL.
 * Rejects empty strings, relative paths, and dangerous protocols like javascript: or data:.
 */
export function isValidHttpUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      Boolean(parsed.hostname) &&
      parsed.hostname.includes('.')
    );
  } catch {
    return false;
  }
}

/**
 * Validates that a date string is in YYYY-MM-DD format and represents a valid calendar date.
 */
export function isValidDateString(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;

  const [yearStr, monthStr, dayStr] = trimmed.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const dateObj = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(dateObj.getTime())) return false;

  return (
    dateObj.getUTCFullYear() === year &&
    dateObj.getUTCMonth() === month - 1 &&
    dateObj.getUTCDate() === day
  );
}

/**
 * Counts the number of non-whitespace characters in a string.
 */
export function getNonWhitespaceLength(value) {
  if (typeof value !== 'string') return 0;
  return value.replace(/\s+/g, '').length;
}

/**
 * Evaluates all 6 mandatory readiness gates (R-01 through R-06) for a handover.
 *
 * @param {Object} handover - The handover object to evaluate
 * @returns {Object} Readiness evaluation summary and per-gate details
 */
export function evaluateReadiness(handover) {
  const h = handover || {};

  // ---------------------------------------------------------------------------
  // R-01: Commercial & Timeline Baseline
  // Require a client (trimmed length >= 2), a positive deal value (> 0),
  // and a valid target launch date (YYYY-MM-DD).
  // ---------------------------------------------------------------------------
  const hasClient =
    typeof h.client_name === 'string' && h.client_name.trim().length >= 2;
  const numericDealValue = Number(h.deal_value);
  const hasPositiveValue =
    h.deal_value !== null &&
    h.deal_value !== undefined &&
    h.deal_value !== '' &&
    Number.isFinite(numericDealValue) &&
    numericDealValue > 0;
  const hasValidLaunchDate = isValidDateString(h.target_launch_date);
  const r01Passed = hasClient && hasPositiveValue && hasValidLaunchDate;

  const r01MissingParts = [];
  if (!hasClient) r01MissingParts.push('client name');
  if (!hasPositiveValue) r01MissingParts.push('positive deal value');
  if (!hasValidLaunchDate) r01MissingParts.push('valid target launch date');

  const r01Gate = {
    id: 'R-01',
    title: 'Commercial & Timeline Baseline',
    sectionId: 'section-overview',
    passed: r01Passed,
    status: r01Passed ? 'PASSED' : 'BLOCKED',
    currentStatusText: r01Passed
      ? `${h.client_name.trim()} • $${numericDealValue.toLocaleString()} • Launch ${h.target_launch_date}`
      : `Missing: ${r01MissingParts.join(', ')}`,
    whyItBlocks:
      'Delivery cannot schedule capacity or track budget without a confirmed client, positive deal value, and target launch date.',
    actionNeeded:
      'Enter Client Name, Deal Value ($ > 0), and Target Launch Date in Overview.',
  };

  // ---------------------------------------------------------------------------
  // R-02: Detailed Scope Summary (Scope Clarity)
  // Require a scope summary containing at least 30 non-whitespace characters.
  // ---------------------------------------------------------------------------
  const scopeNonWhitespaceCount = getNonWhitespaceLength(h.scope_summary);
  const scopeTrimmedCount =
    typeof h.scope_summary === 'string' ? h.scope_summary.trim().length : 0;
  const r02Passed = scopeNonWhitespaceCount >= 30 && scopeTrimmedCount >= 30;

  const r02Gate = {
    id: 'R-02',
    title: 'Detailed Scope Summary',
    sectionId: 'section-overview',
    passed: r02Passed,
    status: r02Passed ? 'PASSED' : 'BLOCKED',
    currentStatusText: r02Passed
      ? `Scope defined (${scopeNonWhitespaceCount} non-whitespace chars)`
      : `Too brief: ${scopeNonWhitespaceCount}/30 non-whitespace chars (${scopeTrimmedCount} total chars)`,
    whyItBlocks:
      'Vague or one-line scope notes cause immediate scope creep and client disputes during kickoff.',
    actionNeeded:
      'Write a clear Scope Summary of at least 30 non-whitespace characters defining project boundaries.',
  };

  // ---------------------------------------------------------------------------
  // R-03: Agreed Deliverables (Defined Deliverables)
  // Require at least 2 deliverables, each with a valid title (>= 3 chars) and due date.
  // ---------------------------------------------------------------------------
  const deliverables = Array.isArray(h.deliverables) ? h.deliverables : [];
  const validDeliverables = deliverables.filter(
    (d) =>
      d &&
      typeof d.title === 'string' &&
      d.title.trim().length >= 3 &&
      isValidDateString(d.due_date)
  );
  const r03Passed =
    deliverables.length >= 2 && validDeliverables.length === deliverables.length;

  const r03Gate = {
    id: 'R-03',
    title: 'Agreed Deliverables',
    sectionId: 'section-deliverables',
    passed: r03Passed,
    status: r03Passed ? 'PASSED' : 'BLOCKED',
    currentStatusText: r03Passed
      ? `${deliverables.length} deliverables itemized with milestone dates`
      : deliverables.length < 2
        ? `Only ${deliverables.length} of 2 minimum deliverables added`
        : `${deliverables.length - validDeliverables.length} deliverable(s) missing a valid title or target date`,
    whyItBlocks:
      'Delivery leads cannot build a sprint schedule without at least 2 concrete deliverables and milestone dates.',
    actionNeeded:
      'Add at least 2 deliverables with valid titles and target dates.',
  };

  // ---------------------------------------------------------------------------
  // R-04: Mandatory Client Dependencies (Dependency Readiness)
  // Require at least 1 mandatory dependency and ensure every mandatory
  // dependency has a meaningful title and is explicitly resolved.
  // ---------------------------------------------------------------------------
  const dependencies = Array.isArray(h.dependencies) ? h.dependencies : [];
  const mandatoryDeps = dependencies.filter(
    (d) => d && d.is_mandatory === true
  );
  const hasMeaningfulTitle = (d) =>
    Boolean(d && typeof d.title === 'string' && d.title.trim().length > 0);

  const malformedMandatoryDeps = mandatoryDeps.filter(
    (d) => !hasMeaningfulTitle(d)
  );
  const unresolvedMandatoryDeps = mandatoryDeps.filter(
    (d) => d.is_resolved !== true
  );
  const blockingMandatoryDeps = mandatoryDeps.filter(
    (d) => !hasMeaningfulTitle(d) || d.is_resolved !== true
  );
  const r04Passed =
    mandatoryDeps.length >= 1 && blockingMandatoryDeps.length === 0;

  let r04StatusText;
  if (r04Passed) {
    r04StatusText = `All ${mandatoryDeps.length} mandatory dependencies verified & resolved`;
  } else if (mandatoryDeps.length === 0) {
    r04StatusText = 'No mandatory dependencies defined (at least 1 required)';
  } else if (malformedMandatoryDeps.length > 0 && unresolvedMandatoryDeps.length === 0) {
    r04StatusText = `${malformedMandatoryDeps.length} mandatory dependency item(s) missing a valid title`;
  } else {
    const labels = blockingMandatoryDeps.map((d) =>
      hasMeaningfulTitle(d) ? `"${d.title.trim()}"` : '"Untitled mandatory dependency"'
    );
    r04StatusText = `${blockingMandatoryDeps.length} of ${mandatoryDeps.length} mandatory dependency item(s) unresolved or invalid (${labels.join(', ')})`;
  }

  const r04Gate = {
    id: 'R-04',
    title: 'Mandatory Client Dependencies',
    sectionId: 'section-dependencies',
    passed: r04Passed,
    status: r04Passed ? 'PASSED' : 'BLOCKED',
    currentStatusText: r04StatusText,
    whyItBlocks:
      'Starting engineering or design work without mandatory client credentials or environment access stalls the team mid-sprint.',
    actionNeeded:
      'Ensure at least 1 mandatory dependency exists and check off all mandatory items as resolved.',
  };

  // ---------------------------------------------------------------------------
  // R-05: Supporting Documents Linked (Supporting Documentation)
  // Require at least 1 document with a valid non-empty label and a valid HTTP or HTTPS URL.
  // ---------------------------------------------------------------------------
  const documents = Array.isArray(h.document_links) ? h.document_links : [];
  const validDocuments = documents.filter(
    (doc) =>
      doc &&
      typeof doc.label === 'string' &&
      doc.label.trim().length > 0 &&
      isValidHttpUrl(doc.url)
  );
  const r05Passed = validDocuments.length >= 1;

  const r05Gate = {
    id: 'R-05',
    title: 'Supporting Documents Linked',
    sectionId: 'section-documents',
    passed: r05Passed,
    status: r05Passed ? 'PASSED' : 'BLOCKED',
    currentStatusText: r05Passed
      ? `${validDocuments.length} verified document link(s) attached`
      : documents.length === 0
        ? 'No supporting documents linked'
        : 'No valid document link found (requires non-empty label and valid http:// or https:// URL)',
    whyItBlocks:
      'Verbal sales promises are unenforceable without a linked SOW, signed proposal, or technical specification.',
    actionNeeded:
      'Attach at least 1 valid http:// or https:// link to supporting documentation.',
  };

  // ---------------------------------------------------------------------------
  // R-06: Assigned Delivery Owner (Delivery Ownership)
  // Require an assigned delivery owner (both id and name present).
  // ---------------------------------------------------------------------------
  const hasOwnerId =
    typeof h.delivery_owner_id === 'string' &&
    h.delivery_owner_id.trim().length > 0;
  const hasOwnerName =
    typeof h.delivery_owner_name === 'string' &&
    h.delivery_owner_name.trim().length > 0;
  const r06Passed = hasOwnerId && hasOwnerName;

  const r06Gate = {
    id: 'R-06',
    title: 'Assigned Delivery Owner',
    sectionId: 'section-overview',
    passed: r06Passed,
    status: r06Passed ? 'PASSED' : 'BLOCKED',
    currentStatusText: r06Passed
      ? `Assigned to ${h.delivery_owner_name.trim()}`
      : 'Unassigned — no receiving Delivery Lead selected',
    whyItBlocks:
      'An unassigned handover sits in limbo with zero accountability for client onboarding and kickoff.',
    actionNeeded:
      'Select and assign a receiving Delivery Lead from the Delivery Owner dropdown.',
  };

  const gates = [r01Gate, r02Gate, r03Gate, r04Gate, r05Gate, r06Gate];
  const passedCount = gates.filter((g) => g.passed).length;
  const totalCount = 6;
  const percentage = Math.round((passedCount / totalCount) * 100);
  const isReady = passedCount === totalCount;
  const blockers = gates.filter((g) => !g.passed);

  return {
    passedCount,
    totalCount,
    percentage,
    isReady,
    canMarkReady: isReady,
    gates,
    gateResults: gates,
    blockers,
  };
}

