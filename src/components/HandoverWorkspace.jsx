import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lock,
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
  Briefcase,
  CheckSquare,
  FileText,
  UserCheck,
  Save,
  AlignLeft,
  ShieldCheck,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import {
  evaluateReadiness,
  isValidHttpUrl,
  isValidDateString,
  getNonWhitespaceLength,
} from '../lib/readinessEngine.js';
import { generateId, canPerformAction } from '../lib/workflowRules.js';
import { DELIVERY_OWNERS } from '../constants/demoUsers.js';
import { ACME_SAMPLE_SCOPE } from '../constants/seedData.js';
import ReadinessPanel from './ReadinessPanel.jsx';
import ActivityTimeline from './ActivityTimeline.jsx';

const STATUS_META = {
  Draft: {
    pill: 'bg-slate-100 text-slate-700 border-slate-300',
    Icon: Clock,
  },
  Blocked: {
    pill: 'bg-rose-50 text-rose-800 border-rose-200',
    Icon: ShieldAlert,
  },
  'Ready for Delivery': {
    pill: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    Icon: ShieldCheck,
  },
  'Handed Over': {
    pill: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Icon: Lock,
  },
};

export default function HandoverWorkspace({
  handover,
  activeUser,
  onBack,
  onSaveChanges,
  onMarkReady,
  onAcceptHandover,
  onReturnToSales,
  onSelectUser,
  isSaving,
}) {
  // Local form state for Overview & Scope fields
  const [projectName, setProjectName] = useState(handover?.project_name || '');
  const [clientName, setClientName] = useState(handover?.client_name || '');
  const [dealValue, setDealValue] = useState(
    handover?.deal_value !== undefined ? String(handover.deal_value) : ''
  );
  const [targetLaunchDate, setTargetLaunchDate] = useState(
    handover?.target_launch_date || ''
  );
  const [scopeSummary, setScopeSummary] = useState(
    handover?.scope_summary || ''
  );
  const [deliveryOwnerId, setDeliveryOwnerId] = useState(
    handover?.delivery_owner_id || ''
  );
  const [deliveryOwnerName, setDeliveryOwnerName] = useState(
    handover?.delivery_owner_name || ''
  );

  // Add Deliverable form state
  const [newDelivTitle, setNewDelivTitle] = useState('');
  const [newDelivDate, setNewDelivDate] = useState('2026-12-05');
  const [delivError, setDelivError] = useState('');

  // Add Dependency form state
  const [newDepTitle, setNewDepTitle] = useState('');
  const [newDepMandatory, setNewDepMandatory] = useState(true);
  const [depError, setDepError] = useState('');

  // Add Document Link form state
  const [newDocLabel, setNewDocLabel] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [docError, setDocError] = useState('');

  // Highlighted section on Jump to Fix
  const [highlightedSection, setHighlightedSection] = useState(null);

  // Sync local form fields when handover prop updates
  useEffect(() => {
    if (!handover) return;
    setProjectName(handover.project_name || '');
    setClientName(handover.client_name || '');
    setDealValue(
      handover.deal_value !== undefined ? String(handover.deal_value) : ''
    );
    setTargetLaunchDate(handover.target_launch_date || '');
    setScopeSummary(handover.scope_summary || '');
    setDeliveryOwnerId(handover.delivery_owner_id || '');
    setDeliveryOwnerName(handover.delivery_owner_name || '');
  }, [handover?.id, handover?.updated_at]);

  const isHandedOver = handover?.status === 'Handed Over';
  const canEditByRole = canPerformAction('EDIT', handover, activeUser);
  const isLocked = isHandedOver || !canEditByRole;

  // Check if local overview/scope fields differ from persisted handover
  const hasUnsavedOverview = useMemo(() => {
    if (!handover) return false;
    return (
      projectName !== (handover.project_name || '') ||
      clientName !== (handover.client_name || '') ||
      Number(dealValue) !== Number(handover.deal_value) ||
      targetLaunchDate !== (handover.target_launch_date || '') ||
      scopeSummary !== (handover.scope_summary || '') ||
      (deliveryOwnerId || null) !== (handover.delivery_owner_id || null)
    );
  }, [
    handover,
    projectName,
    clientName,
    dealValue,
    targetLaunchDate,
    scopeSummary,
    deliveryOwnerId,
  ]);

  // Live readiness evaluation combining current form inputs and checklist arrays
  const liveHandoverDraft = useMemo(() => {
    if (!handover) return null;
    return {
      ...handover,
      project_name: projectName,
      client_name: clientName,
      deal_value: dealValue === '' ? 0 : Number(dealValue),
      target_launch_date: targetLaunchDate,
      scope_summary: scopeSummary,
      delivery_owner_id: deliveryOwnerId || null,
      delivery_owner_name: deliveryOwnerName || null,
    };
  }, [
    handover,
    projectName,
    clientName,
    dealValue,
    targetLaunchDate,
    scopeSummary,
    deliveryOwnerId,
    deliveryOwnerName,
  ]);

  const liveReadiness = useMemo(
    () => evaluateReadiness(liveHandoverDraft),
    [liveHandoverDraft]
  );

  if (!handover) return null;

  const gateMap = Object.fromEntries(
    liveReadiness.gates.map((g) => [g.id, g])
  );
  const scopeNonWhitespaceChars = getNonWhitespaceLength(scopeSummary);
  const statusMeta = STATUS_META[handover.status] || STATUS_META.Blocked;
  const StatusIcon = statusMeta.Icon;

  const mandatoryDeps = (handover.dependencies || []).filter(
    (d) => d && d.is_mandatory === true
  );
  const resolvedMandatoryCount = mandatoryDeps.filter(
    (d) =>
      typeof d.title === 'string' &&
      d.title.trim().length > 0 &&
      d.is_resolved === true
  ).length;

  const validDocsCount = (handover.document_links || []).filter(
    (doc) =>
      doc &&
      typeof doc.label === 'string' &&
      doc.label.trim().length > 0 &&
      isValidHttpUrl(doc.url)
  ).length;

  function handleJumpToSection(sectionId, gateId) {
    // Map R-02 to its dedicated #section-scope card
    const targetSectionId =
      gateId === 'R-02' ? 'section-scope' : sectionId || 'section-overview';

    setHighlightedSection(targetSectionId);
    const el = document.getElementById(targetSectionId);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Focus the corresponding field if editable
    const focusMap = {
      'R-01': 'client-name-input',
      'R-02': 'scope-summary-textarea',
      'R-03': 'new-deliverable-title',
      'R-04': 'first-unresolved-dep-checkbox',
      'R-05': 'new-document-label',
      'R-06': 'delivery-owner-select',
    };
    const focusTargetId = focusMap[gateId];
    if (focusTargetId && !isLocked) {
      setTimeout(() => {
        const inputEl =
          document.getElementById(focusTargetId) ||
          (gateId === 'R-04'
            ? document.getElementById('new-dependency-title')
            : null);
        if (inputEl && typeof inputEl.focus === 'function') {
          inputEl.focus({ preventScroll: true });
        }
      }, 260);
    }

    setTimeout(() => {
      setHighlightedSection((prev) =>
        prev === targetSectionId ? null : prev
      );
    }, 2200);
  }

  async function handleSaveOverview(e) {
    if (e) e.preventDefault();
    if (isLocked) return;
    await onSaveChanges(
      {
        project_name: projectName.trim(),
        client_name: clientName.trim(),
        deal_value: Number(dealValue),
        target_launch_date: targetLaunchDate,
        scope_summary: scopeSummary,
        delivery_owner_id: deliveryOwnerId || null,
        delivery_owner_name: deliveryOwnerName || null,
      },
      'Updated Project Overview & Scope Summary.'
    );
  }

  async function handleInsertSampleScope() {
    if (isLocked) return;
    setScopeSummary(ACME_SAMPLE_SCOPE);
    await onSaveChanges(
      {
        project_name: projectName.trim() || handover.project_name,
        client_name: clientName.trim() || handover.client_name,
        deal_value: Number(dealValue) || handover.deal_value,
        target_launch_date: targetLaunchDate || handover.target_launch_date,
        scope_summary: ACME_SAMPLE_SCOPE,
        delivery_owner_id: deliveryOwnerId || null,
        delivery_owner_name: deliveryOwnerName || null,
      },
      'Populated detailed Scope Summary (Gate R-02 satisfied).'
    );
  }

  async function handleSelectDeliveryOwner(ownerId) {
    if (isLocked) return;
    const found = DELIVERY_OWNERS.find((o) => o.id === ownerId);
    const nextId = found ? found.id : null;
    const nextName = found ? found.name : null;

    setDeliveryOwnerId(nextId || '');
    setDeliveryOwnerName(nextName || '');

    await onSaveChanges(
      {
        project_name: projectName.trim() || handover.project_name,
        client_name: clientName.trim() || handover.client_name,
        deal_value: Number(dealValue) || handover.deal_value,
        target_launch_date: targetLaunchDate || handover.target_launch_date,
        scope_summary: scopeSummary,
        delivery_owner_id: nextId,
        delivery_owner_name: nextName,
      },
      nextName
        ? `Assigned receiving Delivery Owner: ${nextName} (Gate R-06 satisfied).`
        : 'Cleared Delivery Owner assignment (Gate R-06 now blocked).'
    );
  }

  async function handleMarkReadyWithFlush() {
    if (hasUnsavedOverview && !isLocked) {
      await onSaveChanges(
        {
          project_name: projectName.trim(),
          client_name: clientName.trim(),
          deal_value: Number(dealValue),
          target_launch_date: targetLaunchDate,
          scope_summary: scopeSummary,
          delivery_owner_id: deliveryOwnerId || null,
          delivery_owner_name: deliveryOwnerName || null,
        },
        'Saved overview & scope edits prior to readiness submission.'
      );
    }
    await onMarkReady();
  }

  // Deliverables handlers (Gate R-03)
  async function handleAddDeliverable(e) {
    e.preventDefault();
    setDelivError('');
    if (isLocked) return;

    const cleanTitle = newDelivTitle.trim();
    if (cleanTitle.length < 3) {
      setDelivError('Deliverable title must be at least 3 characters.');
      return;
    }
    if (!isValidDateString(newDelivDate)) {
      setDelivError('Please select a valid milestone due date (YYYY-MM-DD).');
      return;
    }

    const nextDeliverables = [
      ...(handover.deliverables || []),
      {
        id: generateId('del'),
        title: cleanTitle,
        due_date: newDelivDate,
      },
    ];

    await onSaveChanges(
      { deliverables: nextDeliverables },
      `Added deliverable "${cleanTitle}" (Due ${newDelivDate}).`
    );
    setNewDelivTitle('');
  }

  async function handleRemoveDeliverable(delivId, title) {
    if (isLocked) return;
    const nextDeliverables = (handover.deliverables || []).filter(
      (d) => d.id !== delivId
    );
    await onSaveChanges(
      { deliverables: nextDeliverables },
      `Removed deliverable "${title}".`
    );
  }

  // Dependencies handlers (Gate R-04)
  async function handleToggleDependency(depId) {
    if (isLocked) return;
    let toggledItem = null;
    const nextDependencies = (handover.dependencies || []).map((dep) => {
      if (dep.id === depId) {
        toggledItem = { ...dep, is_resolved: !dep.is_resolved };
        return toggledItem;
      }
      return dep;
    });

    if (!toggledItem) return;
    await onSaveChanges(
      { dependencies: nextDependencies },
      `${
        toggledItem.is_resolved ? 'Verified & resolved' : 'Unchecked'
      } dependency: "${toggledItem.title}".`
    );
  }

  async function handleAddDependency(e) {
    e.preventDefault();
    setDepError('');
    if (isLocked) return;

    const cleanTitle = newDepTitle.trim();
    if (cleanTitle.length < 3) {
      setDepError('Dependency title must be at least 3 characters.');
      return;
    }

    const nextDependencies = [
      ...(handover.dependencies || []),
      {
        id: generateId('dep'),
        title: cleanTitle,
        is_mandatory: Boolean(newDepMandatory),
        is_resolved: false,
      },
    ];

    await onSaveChanges(
      { dependencies: nextDependencies },
      `Added ${
        newDepMandatory ? 'mandatory' : 'optional'
      } client dependency "${cleanTitle}".`
    );
    setNewDepTitle('');
  }

  async function handleRemoveDependency(depId, title) {
    if (isLocked) return;
    const nextDependencies = (handover.dependencies || []).filter(
      (d) => d.id !== depId
    );
    await onSaveChanges(
      { dependencies: nextDependencies },
      `Removed dependency "${title}".`
    );
  }

  // Document Links handlers (Gate R-05)
  async function handleAddDocument(e) {
    e.preventDefault();
    setDocError('');
    if (isLocked) return;

    const cleanLabel = newDocLabel.trim();
    const cleanUrl = newDocUrl.trim();

    if (cleanLabel.length < 1) {
      setDocError('Document label cannot be empty.');
      return;
    }
    if (!isValidHttpUrl(cleanUrl)) {
      setDocError(
        'Please enter a valid http:// or https:// URL (e.g., https://notion.so/project-sow).'
      );
      return;
    }

    const nextDocs = [
      ...(handover.document_links || []),
      {
        id: generateId('doc'),
        label: cleanLabel,
        url: cleanUrl,
      },
    ];

    await onSaveChanges(
      { document_links: nextDocs },
      `Attached supporting document "${cleanLabel}".`
    );
    setNewDocLabel('');
    setNewDocUrl('');
  }

  async function handleRemoveDocument(docId, label) {
    if (isLocked) return;
    const nextDocs = (handover.document_links || []).filter(
      (doc) => doc.id !== docId
    );
    await onSaveChanges(
      { document_links: nextDocs },
      `Removed supporting document "${label}".`
    );
  }

  // Track first unresolved mandatory dependency for focus targeting
  let assignedFirstUnresolvedId = false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Top Workspace Header */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Command Center</span>
            </button>
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
              {handover.client_name}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.pill}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              <span>{handover.status}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold tabular-nums ${
                liveReadiness.isReady
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              <span>
                {liveReadiness.passedCount}/{liveReadiness.totalCount} Gates Passed
              </span>
            </span>
          </div>
        </div>

        {/* Project Title & 4-Column Operational Metadata Strip */}
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              {handover.project_name}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Sales-to-Delivery Handover Package • Updated{' '}
              {handover.updated_at
                ? new Date(handover.updated_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recently'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Deal Value
              </span>
              <span className="mt-0.5 block text-sm font-extrabold text-slate-900 tabular-nums">
                ${Number(handover.deal_value || 0).toLocaleString()}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Target Launch
              </span>
              <span className="mt-0.5 block text-xs font-bold text-slate-800 tabular-nums">
                {handover.target_launch_date || 'Not set'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Sales Owner
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-slate-800 truncate">
                {handover.sales_owner_name || 'Aarav Mehta (Sales)'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Delivery Owner
              </span>
              <span
                className={`mt-0.5 block text-xs font-bold truncate ${
                  handover.delivery_owner_name
                    ? 'text-emerald-700'
                    : 'text-rose-600'
                }`}
              >
                {handover.delivery_owner_name || 'Unassigned (R-06)'}
              </span>
            </div>
          </div>
        </div>

        {/* Read-Only Lock Banner when Handed Over or when viewing as Delivery persona */}
        {isHandedOver ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-xs text-emerald-950">
            <Lock className="h-4 w-4 shrink-0 text-emerald-700" />
            <div>
              <span className="font-bold">
                Read-Only Handed Over Record:{' '}
              </span>
              This deal has been formally accepted by Delivery. All form inputs and checklists are locked to preserve handover integrity. Click{' '}
              <span className="font-semibold">Reset Demo Data</span> in the top navigation bar to replay the demo.
            </div>
          </div>
        ) : !canEditByRole ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-950">
            <Lock className="h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <span className="font-bold">
                Read-Only View for Delivery Persona:{' '}
              </span>
              Field and checklist editing is restricted to{' '}
              <span className="font-semibold">Sales</span> and{' '}
              <span className="font-semibold">Ops</span> personas. As Delivery, you can review this handover and either{' '}
              <span className="font-semibold">Accept &amp; Complete</span> or{' '}
              <span className="font-semibold">Send Back to Sales</span> once it is marked Ready for Delivery.
            </div>
          </div>
        ) : null}
      </div>

      {/* Main Split-Screen Workspace Grid (Left 7 cols: 6 Operational Sections, Right 5 cols: Sticky Readiness Engine) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: 6 Structured Handover Sections */}
        <div className="space-y-6 lg:col-span-7">
          {/* SECTION 1: Commercial Baseline & Delivery Ownership (Gates R-01 & R-06) */}
          <section
            id="section-overview"
            className={`rounded-2xl border bg-white p-5 shadow-2xs transition ${
              highlightedSection === 'section-overview'
                ? 'border-indigo-500 ring-2 ring-indigo-200'
                : 'border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    1. Commercial Baseline &amp; Delivery Ownership
                  </h2>
                  <p className="text-xs text-slate-500">
                    Evaluates Gate R-01 (Client, Deal Value &gt; $0, Launch Date) and Gate R-06 (Receiving Delivery Owner)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {['R-01', 'R-06'].map((gId) => {
                  const g = gateMap[gId];
                  return (
                    <span
                      key={gId}
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                        g?.passed
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-rose-200 bg-rose-50 text-rose-800'
                      }`}
                    >
                      {gId} {g?.passed ? '✓ Passed' : '✕ Blocked'}
                    </span>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSaveOverview} className="mt-4 space-y-4">
              {/* Row 1: Client Name & Project Name */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="client-name-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Client Name (Gate R-01) *
                  </label>
                  <input
                    id="client-name-input"
                    type="text"
                    disabled={isLocked}
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="project-name-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Project Name *
                  </label>
                  <input
                    id="project-name-input"
                    type="text"
                    disabled={isLocked}
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>

              {/* Row 2: Deal Value & Target Launch Date */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="deal-value-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Deal Value USD (Gate R-01: &gt; $0) *
                  </label>
                  <input
                    id="deal-value-input"
                    type="number"
                    min="1"
                    disabled={isLocked}
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 tabular-nums focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="target-launch-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Target Launch Date (Gate R-01) *
                  </label>
                  <input
                    id="target-launch-input"
                    type="date"
                    disabled={isLocked}
                    value={targetLaunchDate}
                    onChange={(e) => setTargetLaunchDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 tabular-nums focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>

              {/* Row 3: Assigned Receiving Delivery Owner (Gate R-06) */}
              <div
                className={`rounded-xl border p-3.5 transition ${
                  gateMap['R-06']?.passed
                    ? 'border-slate-200 bg-slate-50/70'
                    : 'border-rose-200 bg-rose-50/40'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="delivery-owner-select"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-800"
                  >
                    <UserCheck className="h-4 w-4 text-indigo-600" />
                    <span>Assigned Receiving Delivery Owner (Gate R-06) *</span>
                  </label>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      gateMap['R-06']?.passed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {gateMap['R-06']?.passed
                      ? `Assigned: ${deliveryOwnerName}`
                      : 'Blocker: Unassigned'}
                  </span>
                </div>

                <select
                  id="delivery-owner-select"
                  disabled={isLocked || isSaving}
                  value={deliveryOwnerId}
                  onChange={(e) => handleSelectDeliveryOwner(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">
                    — Select Receiving Delivery Lead (Unassigned) —
                  </option>
                  {DELIVERY_OWNERS.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name}
                    </option>
                  ))}
                </select>
              </div>

              {!isLocked && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    {hasUnsavedOverview
                      ? 'Unsaved edits detected in baseline or scope fields.'
                      : 'Commercial baseline & ownership saved.'}
                  </span>
                  <button
                    type="submit"
                    disabled={isSaving || !hasUnsavedOverview}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* SECTION 2: Detailed Scope Summary (Gate R-02) */}
          <section
            id="section-scope"
            className={`rounded-2xl border bg-white p-5 shadow-2xs transition ${
              highlightedSection === 'section-scope'
                ? 'border-indigo-500 ring-2 ring-indigo-200'
                : 'border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <AlignLeft className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    2. Detailed Scope Summary
                  </h2>
                  <p className="text-xs text-slate-500">
                    Gate R-02 requires at least 30 non-whitespace characters defining agreed project scope
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md border px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                    gateMap['R-02']?.passed
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
                >
                  R-02 {gateMap['R-02']?.passed ? '✓ Passed' : '✕ Blocked'} (
                  {scopeNonWhitespaceChars}/30 min chars)
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveOverview} className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="scope-summary-textarea"
                  className="text-xs font-semibold text-slate-700"
                >
                  Agreed Scope &amp; Architectural Boundaries *
                </label>

                {!isLocked && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleInsertSampleScope}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 shadow-2xs transition hover:bg-indigo-100 disabled:opacity-50 cursor-pointer"
                    title="Populate a realistic 155-character agency scope summary in 1 click"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    <span>✨ Insert Full Scope Summary</span>
                  </button>
                )}
              </div>

              <textarea
                id="scope-summary-textarea"
                rows={3}
                disabled={isLocked}
                value={scopeSummary}
                onChange={(e) => setScopeSummary(e.target.value)}
                placeholder="Describe agreed deliverables, platforms, integrations, and out-of-scope boundaries (min 30 non-whitespace chars)..."
                className={`w-full rounded-xl border p-3 text-xs text-slate-900 leading-relaxed focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 ${
                  scopeNonWhitespaceChars >= 30
                    ? 'border-slate-300 focus:border-indigo-500'
                    : 'border-rose-300 bg-rose-50/20 focus:border-rose-500'
                }`}
              />

              {!isLocked && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    Current non-whitespace length:{' '}
                    <strong className="text-slate-700">
                      {scopeNonWhitespaceChars}
                    </strong>{' '}
                    / 30 required characters
                  </span>
                  <button
                    type="submit"
                    disabled={isSaving || !hasUnsavedOverview}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>
                      {isSaving ? 'Saving...' : 'Save Scope Summary'}
                    </span>
                  </button>
                </div>
              )}
            </form>
          </section>

          {/* SECTION 3: Agreed Deliverables (Gate R-03) */}
          <section
            id="section-deliverables"
            className={`rounded-2xl border bg-white p-5 shadow-2xs transition ${
              highlightedSection === 'section-deliverables'
                ? 'border-indigo-500 ring-2 ring-indigo-200'
                : 'border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    3. Agreed Deliverables &amp; Milestone Dates
                  </h2>
                  <p className="text-xs text-slate-500">
                    Gate R-03 requires at least 2 deliverables, each with a valid title and target due date
                  </p>
                </div>
              </div>

              <span
                className={`rounded-md border px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                  gateMap['R-03']?.passed
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                R-03 {gateMap['R-03']?.passed ? '✓ Passed' : '✕ Blocked'} (
                {(handover.deliverables || []).length}/2 min)
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {(handover.deliverables || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 p-4 text-center text-xs text-rose-700">
                  No deliverables added yet. Add at least 2 concrete deliverables with target dates to satisfy Gate R-03.
                </div>
              ) : (
                (handover.deliverables || []).map((deliv, index) => {
                  const itemValid =
                    typeof deliv.title === 'string' &&
                    deliv.title.trim().length >= 3 &&
                    isValidDateString(deliv.due_date);

                  return (
                    <div
                      key={deliv.id || index}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-xs ${
                        itemValid
                          ? 'border-slate-200 bg-slate-50/70'
                          : 'border-rose-300 bg-rose-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {itemValid ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {deliv.title}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Target Milestone Date:{' '}
                            <span className="font-medium text-slate-700 tabular-nums">
                              {deliv.due_date || 'Missing date'}
                            </span>
                          </p>
                        </div>
                      </div>

                      {!isLocked && (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            handleRemoveDeliverable(deliv.id, deliv.title)
                          }
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          title="Remove deliverable"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}

              {!isLocked && (
                <form
                  onSubmit={handleAddDeliverable}
                  className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5"
                >
                  {delivError && (
                    <p className="text-xs font-semibold text-rose-600">
                      {delivError}
                    </p>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="new-deliverable-title"
                      type="text"
                      aria-label="New deliverable title"
                      value={newDelivTitle}
                      onChange={(e) => setNewDelivTitle(e.target.value)}
                      placeholder="New deliverable title (e.g., Staging QA & Performance Audit)..."
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                    <input
                      id="new-deliverable-date"
                      type="date"
                      aria-label="New deliverable due date"
                      value={newDelivDate}
                      onChange={(e) => setNewDelivDate(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 tabular-nums focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Deliverable</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

          {/* SECTION 4: Client Access & Mandatory Dependencies (Gate R-04) */}
          <section
            id="section-dependencies"
            className={`rounded-2xl border bg-white p-5 shadow-2xs transition ${
              highlightedSection === 'section-dependencies'
                ? 'border-indigo-500 ring-2 ring-indigo-200'
                : 'border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    4. Client Access &amp; Dependencies Checklist
                  </h2>
                  <p className="text-xs text-slate-500">
                    Gate R-04 requires at least 1 mandatory dependency and all mandatory items resolved
                  </p>
                </div>
              </div>

              <span
                className={`rounded-md border px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                  gateMap['R-04']?.passed
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                R-04 {gateMap['R-04']?.passed ? '✓ Passed' : '✕ Blocked'} (
                {resolvedMandatoryCount}/{mandatoryDeps.length} mandatory)
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {(handover.dependencies || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 p-4 text-center text-xs text-rose-700">
                  No dependencies listed. Gate R-04 requires at least 1 mandatory dependency to be defined and resolved.
                </div>
              ) : (
                (handover.dependencies || []).map((dep) => {
                  const hasValidTitle =
                    typeof dep.title === 'string' &&
                    dep.title.trim().length > 0;
                  const isBlockingThisItem =
                    dep.is_mandatory && (!dep.is_resolved || !hasValidTitle);

                  let checkboxId = undefined;
                  if (isBlockingThisItem && !assignedFirstUnresolvedId) {
                    checkboxId = 'first-unresolved-dep-checkbox';
                    assignedFirstUnresolvedId = true;
                  }

                  return (
                    <div
                      key={dep.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 text-xs transition ${
                        isBlockingThisItem
                          ? 'border-rose-300 bg-rose-50/60'
                          : dep.is_resolved
                            ? 'border-emerald-200 bg-emerald-50/40'
                            : 'border-slate-200 bg-slate-50/70'
                      }`}
                    >
                      <label className="flex flex-1 items-center gap-3 cursor-pointer select-none">
                        <input
                          id={checkboxId}
                          type="checkbox"
                          disabled={isLocked || isSaving}
                          checked={Boolean(dep.is_resolved)}
                          onChange={() => handleToggleDependency(dep.id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`font-semibold ${
                                dep.is_resolved
                                  ? 'text-slate-800'
                                  : 'text-slate-900'
                              }`}
                            >
                              {dep.title}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                dep.is_mandatory
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {dep.is_mandatory ? 'Mandatory' : 'Optional'}
                            </span>
                            {isBlockingThisItem && (
                              <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                Blocks R-04 — Check to Verify
                              </span>
                            )}
                          </div>
                        </div>
                      </label>

                      {!isLocked && (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            handleRemoveDependency(dep.id, dep.title)
                          }
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          title="Remove dependency item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}

              {!isLocked && (
                <form
                  onSubmit={handleAddDependency}
                  className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5"
                >
                  {depError && (
                    <p className="text-xs font-semibold text-rose-600">
                      {depError}
                    </p>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      id="new-dependency-title"
                      type="text"
                      aria-label="New dependency title"
                      value={newDepTitle}
                      onChange={(e) => setNewDepTitle(e.target.value)}
                      placeholder="Add client credential or access dependency..."
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 px-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newDepMandatory}
                        onChange={(e) => setNewDepMandatory(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
                      />
                      <span>Mandatory</span>
                    </label>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Dependency</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

          {/* SECTION 5: Supporting Documentation Links (Gate R-05) */}
          <section
            id="section-documents"
            className={`rounded-2xl border bg-white p-5 shadow-2xs transition ${
              highlightedSection === 'section-documents'
                ? 'border-indigo-500 ring-2 ring-indigo-200'
                : 'border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    5. Supporting Documentation Links
                  </h2>
                  <p className="text-xs text-slate-500">
                    Gate R-05 requires at least 1 document with a label and a valid http:// or https:// URL
                  </p>
                </div>
              </div>

              <span
                className={`rounded-md border px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                  gateMap['R-05']?.passed
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                R-05 {gateMap['R-05']?.passed ? '✓ Passed' : '✕ Blocked'} (
                {validDocsCount} valid)
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {(handover.document_links || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 p-4 text-center text-xs text-rose-700">
                  No supporting documents linked. Attach at least 1 signed SOW, proposal, or spec URL to satisfy Gate R-05.
                </div>
              ) : (
                (handover.document_links || []).map((doc) => {
                  const validDoc =
                    typeof doc.label === 'string' &&
                    doc.label.trim().length > 0 &&
                    isValidHttpUrl(doc.url);

                  return (
                    <div
                      key={doc.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-xs ${
                        validDoc
                          ? 'border-slate-200 bg-slate-50/70'
                          : 'border-rose-300 bg-rose-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {validDoc ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {doc.label}
                          </p>
                          <a
                            href={validDoc ? doc.url : undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline truncate max-w-md"
                          >
                            <span className="truncate">{doc.url}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                      </div>

                      {!isLocked && (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            handleRemoveDocument(doc.id, doc.label)
                          }
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          title="Remove document link"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}

              {!isLocked && (
                <form
                  onSubmit={handleAddDocument}
                  className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5"
                >
                  {docError && (
                    <p className="text-xs font-semibold text-rose-600">
                      {docError}
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                    <input
                      id="new-document-label"
                      type="text"
                      aria-label="New document label"
                      value={newDocLabel}
                      onChange={(e) => setNewDocLabel(e.target.value)}
                      placeholder="Label (e.g., Signed SOW / Figma Spec)"
                      className="sm:col-span-5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                    <input
                      id="new-document-url"
                      type="url"
                      aria-label="New document URL"
                      value={newDocUrl}
                      onChange={(e) => setNewDocUrl(e.target.value)}
                      placeholder="https://notion.so/..."
                      className="sm:col-span-5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Attach</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

          {/* SECTION 6: Chronological Activity & Audit History */}
          <ActivityTimeline logs={handover.activity_logs} />
        </div>

        {/* Right Column: Sticky Deterministic Readiness Engine Panel */}
        <div className="lg:col-span-5">
          <ReadinessPanel
            handover={handover}
            readiness={liveReadiness}
            activeUser={activeUser}
            onMarkReady={handleMarkReadyWithFlush}
            onAcceptHandover={onAcceptHandover}
            onReturnToSales={onReturnToSales}
            onSelectUser={onSelectUser}
            onJumpToSection={handleJumpToSection}
            isSaving={isSaving}
          />
        </div>
      </div>
    </div>
  );
}
