import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Search,
  Plus,
  Calendar,
  User,
  Lock,
  Sparkles,
  FileCheck2,
  Gauge,
  X,
  Check,
  Filter,
  Clock,
} from 'lucide-react';
import { DELIVERY_OWNERS } from '../constants/demoUsers.js';

const STATUS_META = {
  Draft: {
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    accentBorder: 'border-l-slate-400',
    icon: Clock,
  },
  Blocked: {
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
    accentBorder: 'border-l-rose-500',
    icon: AlertTriangle,
  },
  'Ready for Delivery': {
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    accentBorder: 'border-l-indigo-600',
    icon: FileCheck2,
  },
  'Handed Over': {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    accentBorder: 'border-l-emerald-600',
    icon: Lock,
  },
};

const FILTER_TABS = [
  { id: 'All', label: 'All Handovers' },
  { id: 'Blocked', label: 'Blocked' },
  { id: 'Ready for Delivery', label: 'Ready for Delivery' },
  { id: 'Handed Over', label: 'Handed Over' },
];

export default function DashboardView({
  handovers,
  activeUser,
  onSelectHandover,
  onCreateHandover,
  isSaving,
}) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [ownerFilter, setOwnerFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Handover Modal state
  const [newProjectName, setNewProjectName] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newDealValue, setNewDealValue] = useState('35000');
  const [newLaunchDate, setNewLaunchDate] = useState('2026-12-20');
  const [newScopeSummary, setNewScopeSummary] = useState('');
  const [formError, setFormError] = useState('');

  // Dynamic Operational Summary Metrics calculated strictly from live state
  const metrics = useMemo(() => {
    const totalCount = handovers.length;
    const totalValue = handovers.reduce(
      (sum, h) => sum + (Number(h.deal_value) || 0),
      0
    );

    const blockedList = handovers.filter(
      (h) => h.status === 'Blocked' || h.status === 'Draft'
    );
    const blockedValue = blockedList.reduce(
      (sum, h) => sum + (Number(h.deal_value) || 0),
      0
    );
    const totalActiveBlockers = blockedList.reduce(
      (sum, h) => sum + (h.readiness?.blockers?.length || 0),
      0
    );

    const readyList = handovers.filter(
      (h) => h.status === 'Ready for Delivery'
    );
    const readyValue = readyList.reduce(
      (sum, h) => sum + (Number(h.deal_value) || 0),
      0
    );

    const handedOverList = handovers.filter((h) => h.status === 'Handed Over');
    const handedOverValue = handedOverList.reduce(
      (sum, h) => sum + (Number(h.deal_value) || 0),
      0
    );

    const totalPassedGates = handovers.reduce(
      (sum, h) => sum + (h.readiness?.passedCount || 0),
      0
    );
    const totalPossibleGates = totalCount * 6;
    const portfolioReadinessPct =
      totalPossibleGates > 0
        ? Math.round((totalPassedGates / totalPossibleGates) * 100)
        : 0;

    return {
      totalCount,
      totalValue,
      blockedCount: blockedList.length,
      blockedValue,
      totalActiveBlockers,
      readyCount: readyList.length,
      readyValue,
      handedOverCount: handedOverList.length,
      handedOverValue,
      totalPassedGates,
      totalPossibleGates,
      portfolioReadinessPct,
    };
  }, [handovers]);

  // Filtered handovers
  const filteredHandovers = useMemo(() => {
    return handovers.filter((h) => {
      const matchesStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'Blocked'
            ? h.status === 'Blocked' || h.status === 'Draft'
            : h.status === statusFilter;

      const matchesOwner =
        ownerFilter === 'ALL'
          ? true
          : ownerFilter === 'UNASSIGNED'
            ? !h.delivery_owner_id
            : h.delivery_owner_id === ownerFilter;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        h.project_name?.toLowerCase().includes(q) ||
        h.client_name?.toLowerCase().includes(q) ||
        h.sales_owner_name?.toLowerCase().includes(q) ||
        h.delivery_owner_name?.toLowerCase().includes(q);

      return matchesStatus && matchesOwner && matchesSearch;
    });
  }, [handovers, statusFilter, ownerFilter, searchQuery]);

  const acmeHandover = useMemo(
    () =>
      handovers.find(
        (h) =>
          h.id === '11111111-1111-4111-8111-111111111111' ||
          h.project_name === 'Acme Website Redesign'
      ),
    [handovers]
  );

  const canCreate = activeUser?.role === 'sales' || activeUser?.role === 'ops';

  async function handleCreateSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      const created = await onCreateHandover({
        project_name: newProjectName,
        client_name: newClientName,
        deal_value: Number(newDealValue),
        target_launch_date: newLaunchDate,
        scope_summary: newScopeSummary,
      });
      setShowCreateModal(false);
      setNewProjectName('');
      setNewClientName('');
      setNewScopeSummary('');
      if (created?.id) {
        onSelectHandover(created.id);
      }
    } catch (err) {
      setFormError(err.message || 'Could not create handover.');
    }
  }

  function getNextActionSummary(handover, readiness) {
    if (handover.status === 'Handed Over') {
      return {
        text: 'Accepted into Delivery execution • Record locked read-only',
        tone: 'text-emerald-700',
      };
    }
    if (handover.status === 'Ready for Delivery') {
      return {
        text: 'Awaiting Delivery Lead review: Accept or Send Back to Sales',
        tone: 'text-indigo-700',
      };
    }
    if (readiness.isReady) {
      return {
        text: 'All 6/6 gates passed • Ready for Sales/Ops to submit',
        tone: 'text-indigo-700',
      };
    }
    return {
      text: `Action needed: Resolve ${readiness.blockers.length} blocker${
        readiness.blockers.length === 1 ? '' : 's'
      } (${readiness.blockers.map((b) => b.id).join(', ')})`,
      tone: 'text-amber-800',
    };
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* 1. Page Header & Primary Action */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200/90 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <span>Agency Operations</span>
            <span aria-hidden="true">•</span>
            <span>Sales-to-Delivery Handover Queue</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Handover Command Center
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Verify commercial baseline, scope clarity, itemized deliverables, mandatory access, signed docs, and delivery ownership before project execution begins.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {canCreate ? (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 cursor-pointer"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>New Handover</span>
            </button>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-2xs"
              title="Switch persona to Aarav Mehta (Sales) or Vikram Desai (Ops) to create a new handover"
            >
              <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span>Viewing as Delivery (Sales/Ops creates deals)</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Operational Summary Strip (5 Live Calculated Cards) */}
      <section aria-label="Operational Handover Summary">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {/* Card 1: Total Handovers */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Total Handovers
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                {metrics.totalCount}
              </span>
              <span className="text-xs font-semibold text-slate-700 tabular-nums">
                ${metrics.totalValue.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Active agency transition pipeline
            </p>
          </div>

          {/* Card 2: Blocked Handovers */}
          <button
            type="button"
            onClick={() =>
              setStatusFilter(statusFilter === 'Blocked' ? 'All' : 'Blocked')
            }
            className={`rounded-xl border p-4 text-left shadow-2xs transition cursor-pointer ${
              statusFilter === 'Blocked'
                ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-500/20'
                : 'border-slate-200/90 bg-white hover:border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800">
                Blocked Handovers
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-rose-700 tabular-nums">
                {metrics.blockedCount}
              </span>
              <span className="text-xs font-semibold text-rose-700 tabular-nums">
                ${metrics.blockedValue.toLocaleString()} at risk
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600">
              {metrics.totalActiveBlockers} failing readiness gate
              {metrics.totalActiveBlockers === 1 ? '' : 's'}
            </p>
          </button>

          {/* Card 3: Ready / Awaiting Delivery Acceptance */}
          <button
            type="button"
            onClick={() =>
              setStatusFilter(
                statusFilter === 'Ready for Delivery'
                  ? 'All'
                  : 'Ready for Delivery'
              )
            }
            className={`rounded-xl border p-4 text-left shadow-2xs transition cursor-pointer ${
              statusFilter === 'Ready for Delivery'
                ? 'border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                : 'border-slate-200/90 bg-white hover:border-indigo-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-900">
                Awaiting Acceptance
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-indigo-700 tabular-nums">
                {metrics.readyCount}
              </span>
              <span className="text-xs font-semibold text-indigo-700 tabular-nums">
                ${metrics.readyValue.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600">
              Ready for Delivery (6/6 gates passed)
            </p>
          </button>

          {/* Card 4: Handed Over */}
          <button
            type="button"
            onClick={() =>
              setStatusFilter(
                statusFilter === 'Handed Over' ? 'All' : 'Handed Over'
              )
            }
            className={`rounded-xl border p-4 text-left shadow-2xs transition cursor-pointer ${
              statusFilter === 'Handed Over'
                ? 'border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                : 'border-slate-200/90 bg-white hover:border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-900">
                Handed Over
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
                {metrics.handedOverCount}
              </span>
              <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                ${metrics.handedOverValue.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600">
              Accepted by Delivery &amp; locked
            </p>
          </button>

          {/* Card 5: Portfolio Gate Readiness */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Overall Gate Readiness
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-slate-950 tabular-nums">
                {metrics.portfolioReadinessPct}%
              </span>
              <span className="text-xs font-semibold text-slate-600 tabular-nums">
                {metrics.totalPassedGates}/{metrics.totalPossibleGates} gates
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${metrics.portfolioReadinessPct}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Featured Demo Scenario Banner (Acme Website Redesign) */}
      {acmeHandover && (
        <section
          aria-label="Featured Demo Handover"
          className="rounded-xl border border-indigo-200/90 bg-slate-900 p-4 text-white shadow-xs sm:px-5 sm:py-4"
        >
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-200 border border-indigo-400/30">
                  <Sparkles className="h-3 w-3 text-amber-300" aria-hidden="true" />
                  <span>Primary Demo Scenario • Acme Corp</span>
                </span>
                <span className="text-xs font-medium text-slate-300 tabular-nums">
                  Current State:{' '}
                  <strong className="text-white">{acmeHandover.status}</strong> (
                  {acmeHandover.readiness?.passedCount ?? 3}/6 gates •{' '}
                  {acmeHandover.readiness?.percentage ?? 50}%)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <span className="font-semibold text-white">
                  60-Second Flow:
                </span>
                <span>1. Open Acme Website Redesign</span>
                <span aria-hidden="true" className="text-slate-600">→</span>
                <span>2. Fix R-02 (Scope), R-04 (Access) &amp; R-06 (Owner)</span>
                <span aria-hidden="true" className="text-slate-600">→</span>
                <span>3. Mark Ready (Sales)</span>
                <span aria-hidden="true" className="text-slate-600">→</span>
                <span>4. Switch to Priya (Delivery) &amp; Accept</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectHandover(acmeHandover.id)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-400 cursor-pointer"
            >
              <span>Open Acme Handover</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* 4. Filter Tabs, Owner Filter & Search Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs lg:flex-row lg:items-center">
        {/* Status Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter handovers by status"
          className="flex flex-wrap items-center gap-1.5"
        >
          {FILTER_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            const count =
              tab.id === 'All'
                ? handovers.length
                : tab.id === 'Blocked'
                  ? metrics.blockedCount
                  : tab.id === 'Ready for Delivery'
                    ? metrics.readyCount
                    : metrics.handedOverCount;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold tabular-nums ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Delivery Owner Filter + Search Input */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <label htmlFor="dashboard-owner-filter" className="sr-only">
              Filter by Delivery Owner
            </label>
            <select
              id="dashboard-owner-filter"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Delivery Owners</option>
              <option value="UNASSIGNED">Unassigned Only (R-06 Blocked)</option>
              {DELIVERY_OWNERS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="dashboard-search-input" className="sr-only">
              Search handovers by client, project, or owner
            </label>
            <input
              id="dashboard-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search project, client, owner..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search query"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Handover Cards Grid */}
      {filteredHandovers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <ShieldAlert
            className="mx-auto h-9 w-9 text-slate-400"
            aria-hidden="true"
          />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">
            No handovers match your current filters
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Reset the status or owner filter or clear your search query to view all agency handovers.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('All');
              setOwnerFilter('ALL');
              setSearchQuery('');
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredHandovers.map((handover) => {
            const readiness = handover.readiness || {
              passedCount: 0,
              totalCount: 6,
              percentage: 0,
              isReady: false,
              gates: [],
              blockers: [],
            };
            const isAcme =
              handover.id === '11111111-1111-4111-8111-111111111111' ||
              handover.project_name === 'Acme Website Redesign';
            const meta =
              STATUS_META[handover.status] || STATUS_META.Blocked;
            const StatusIcon = meta.icon;
            const nextStep = getNextActionSummary(handover, readiness);

            const barColor =
              handover.status === 'Handed Over'
                ? 'bg-emerald-600'
                : readiness.passedCount === 6
                  ? 'bg-indigo-600'
                  : 'bg-amber-500';

            return (
              <article
                key={handover.id}
                onClick={() => onSelectHandover(handover.id)}
                className={`group relative flex flex-col justify-between rounded-xl border border-l-4 bg-white p-5 shadow-2xs transition hover:border-slate-300 hover:shadow-md cursor-pointer ${
                  meta.accentBorder
                } ${
                  isAcme
                    ? 'border-indigo-200/90 ring-1 ring-indigo-500/15'
                    : 'border-slate-200/90'
                }`}
              >
                <div>
                  {/* Card Header: Client, Project Title & Status Pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                          {handover.client_name}
                        </span>
                        {isAcme && (
                          <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                            <Sparkles
                              className="h-2.5 w-2.5 text-amber-600"
                              aria-hidden="true"
                            />
                            Demo Scenario
                          </span>
                        )}
                      </div>
                      <h2 className="mt-1 text-base font-bold tracking-tight text-slate-950 group-hover:text-indigo-600 transition truncate">
                        {handover.project_name}
                      </h2>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.badge}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{handover.status}</span>
                    </span>
                  </div>

                  {/* Compact Metadata Grid: Deal Value, Launch Date, Sales Owner, Delivery Owner */}
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-xs sm:grid-cols-4">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Deal Value
                      </dt>
                      <dd className="mt-0.5 font-bold text-slate-900 tabular-nums">
                        ${Number(handover.deal_value || 0).toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Target Launch
                      </dt>
                      <dd className="mt-0.5 flex items-center gap-1 font-medium text-slate-700 tabular-nums">
                        <Calendar
                          className="h-3 w-3 text-slate-400 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{handover.target_launch_date || 'Unset'}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Sales Owner
                      </dt>
                      <dd className="mt-0.5 truncate font-medium text-slate-700">
                        {(handover.sales_owner_name || 'Aarav Mehta').replace(
                          /\s*\(.*\)/,
                          ''
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Delivery Owner
                      </dt>
                      <dd className="mt-0.5 truncate">
                        {handover.delivery_owner_name ? (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                            <User
                              className="h-3 w-3 text-emerald-600 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate">
                              {handover.delivery_owner_name.replace(
                                /\s*\(.*\)/,
                                ''
                              )}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                            <AlertTriangle
                              className="h-3 w-3 text-amber-600 shrink-0"
                              aria-hidden="true"
                            />
                            <span>Unassigned</span>
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {/* Readiness Score & 6-Gate Indicator Pills */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        Readiness Engine:{' '}
                        <span className="font-bold text-slate-950 tabular-nums">
                          {readiness.passedCount}/{readiness.totalCount}
                        </span>{' '}
                        Gates Passed
                      </span>
                      <span
                        className={`font-bold tabular-nums ${
                          readiness.passedCount === 6
                            ? 'text-emerald-700'
                            : 'text-slate-700'
                        }`}
                      >
                        {readiness.percentage}%
                      </span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${readiness.percentage}%` }}
                      />
                    </div>

                    {/* 6 Gate Badges */}
                    <div
                      className="flex flex-wrap items-center gap-1.5 pt-1"
                      aria-label="Six readiness gates status"
                    >
                      {readiness.gates.map((gate) => (
                        <span
                          key={gate.id}
                          title={`${gate.id}: ${gate.title} — ${gate.currentStatusText}`}
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                            gate.passed
                              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                              : 'border-rose-200 bg-rose-50/80 text-rose-800'
                          }`}
                        >
                          <span>{gate.id}</span>
                          {gate.passed ? (
                            <Check className="h-3 w-3 text-emerald-600" aria-label="Passed" />
                          ) : (
                            <X className="h-3 w-3 text-rose-600" aria-label="Blocked" />
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Next Action & Open Button */}
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                  <span className={`font-medium truncate ${nextStep.tone}`}>
                    {nextStep.text}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectHandover(handover.id);
                    }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-800 transition group-hover:bg-indigo-600 group-hover:text-white cursor-pointer"
                  >
                    <span>Open Handover</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create New Handover Modal */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-handover-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2
                  id="create-handover-modal-title"
                  className="text-base font-bold text-slate-900"
                >
                  Create New Agency Handover
                </h2>
                <p className="text-xs text-slate-500">
                  Initializes a new handover record with standard agency mandatory dependencies.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800"
                >
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="new-client-name"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Client Name *
                  </label>
                  <input
                    id="new-client-name"
                    type="text"
                    required
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="e.g., Horizon Robotics"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-project-name"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Project Name *
                  </label>
                  <input
                    id="new-project-name"
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., Enterprise Portal Revamp"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="new-deal-value"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Deal Value (USD) *
                  </label>
                  <input
                    id="new-deal-value"
                    type="number"
                    min="1"
                    required
                    value={newDealValue}
                    onChange={(e) => setNewDealValue(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-launch-date"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Target Launch Date *
                  </label>
                  <input
                    id="new-launch-date"
                    type="date"
                    required
                    value={newLaunchDate}
                    onChange={(e) => setNewLaunchDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="new-scope-summary"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Initial Scope Summary (optional — Gate R-02 requires ≥ 30 non-whitespace chars)
                </label>
                <textarea
                  id="new-scope-summary"
                  rows={3}
                  value={newScopeSummary}
                  onChange={(e) => setNewScopeSummary(e.target.value)}
                  placeholder="Outline agreed project scope boundaries..."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Creating...' : 'Create & Open Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
