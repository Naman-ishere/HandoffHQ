import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle2,
  XCircle,
  Rocket,
  RotateCcw,
  ArrowUpRight,
  UserCheck,
  Award,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { DEMO_USERS } from '../constants/demoUsers.js';

export default function ReadinessPanel({
  handover,
  readiness,
  activeUser,
  onMarkReady,
  onAcceptHandover,
  onReturnToSales,
  onSelectUser,
  onJumpToSection,
  isSaving,
}) {
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [acceptNote, setAcceptNote] = useState('');

  if (!handover || !readiness) return null;

  const { passedCount, totalCount, percentage, isReady, gates, blockers } =
    readiness;
  const status = handover.status;
  const role = activeUser?.role;

  const isSalesOrOps = role === 'sales' || role === 'ops';
  const isDeliveryOrOps = role === 'delivery' || role === 'ops';

  const priyaPersona = DEMO_USERS.find((u) => u.role === 'delivery');
  const aaravPersona = DEMO_USERS.find((u) => u.role === 'sales');

  // Compute Next Required Action message
  let nextActionLabel = '';
  if (status === 'Handed Over') {
    nextActionLabel =
      'Handover complete and locked. Ready for Delivery execution.';
  } else if (status === 'Ready for Delivery') {
    nextActionLabel = isDeliveryOrOps
      ? 'Review the 6 passing gates and accept handover (or send back with a reason).'
      : 'Switch persona to Priya Nair (Delivery Lead) to accept or return this handover.';
  } else if (!isReady) {
    const blockerIds = blockers.map((b) => b.id).join(', ');
    nextActionLabel = isSalesOrOps
      ? `Resolve ${blockers.length} failing gate${
          blockers.length === 1 ? '' : 's'
        } (${blockerIds}) to unlock delivery submission.`
      : `Switch persona to Aarav Mehta (Sales) to resolve ${blockers.length} failing gate${
          blockers.length === 1 ? '' : 's'
        } (${blockerIds}).`;
  } else {
    nextActionLabel = isSalesOrOps
      ? 'All 6 gates pass. Click "Mark Ready for Delivery" below to notify Delivery.'
      : 'All 6 gates pass. Switch persona to Sales or Ops to mark Ready for Delivery.';
  }

  async function handleConfirmSendBack(e) {
    e.preventDefault();
    setRejectError('');
    if (rejectReason.trim().length < 5) {
      setRejectError('Please enter a reason of at least 5 characters.');
      return;
    }
    try {
      await onReturnToSales(rejectReason.trim());
      setRejectReason('');
      setShowRejectBox(false);
    } catch (err) {
      setRejectError(err.message || 'Could not send handover back.');
    }
  }

  return (
    <aside
      aria-label="Deterministic Readiness Engine"
      className="sticky top-20 space-y-4"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        {/* Top Dark-Indigo Enterprise Readiness Command Header */}
        <div
          className={`p-5 text-white ${
            status === 'Handed Over'
              ? 'bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950'
              : 'bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950'
          }`}
        >
          {/* Engine Identity & Status Pill */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isReady ? (
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
              )}
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">
                Six-Gate Readiness Engine
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                status === 'Handed Over'
                  ? 'border-emerald-400/30 bg-emerald-500/20 text-emerald-200'
                  : status === 'Ready for Delivery'
                    ? 'border-indigo-400/30 bg-indigo-500/20 text-indigo-200'
                    : isReady
                      ? 'border-emerald-400/30 bg-emerald-500/20 text-emerald-200'
                      : 'border-rose-400/30 bg-rose-500/20 text-rose-200'
              }`}
            >
              {status}
            </span>
          </div>

          {/* Score Readout */}
          <div className="mt-3.5 flex items-baseline justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-extrabold tracking-tight text-white tabular-nums">
                  {passedCount} of {totalCount}
                </p>
                <span className="text-sm font-semibold text-slate-300">
                  Mandatory Gates Passed
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-300">
                {isReady
                  ? 'All 6 deterministic requirements satisfied for delivery sign-off.'
                  : `${blockers.length} mandatory requirement${
                      blockers.length === 1 ? ' is' : 's are'
                    } blocking delivery transition.`}
              </p>
            </div>
            <span
              className={`rounded-lg px-2.5 py-1 text-sm font-extrabold tabular-nums ${
                isReady
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-white/10 text-amber-300 border border-white/15'
              }`}
            >
              {percentage}%
            </span>
          </div>

          {/* 6-Segment Gate Progress Bar */}
          <div
            className="mt-4 grid grid-cols-6 gap-1.5"
            role="progressbar"
            aria-valuenow={passedCount}
            aria-valuemin={0}
            aria-valuemax={totalCount}
            aria-label={`${passedCount} of ${totalCount} readiness gates passed`}
          >
            {gates.map((g) => (
              <div key={g.id} className="space-y-1">
                <div
                  className={`h-2 w-full rounded-full transition-all duration-300 ${
                    g.passed ? 'bg-emerald-400' : 'bg-rose-400/85'
                  }`}
                />
                <span
                  className={`block text-center text-[10px] font-bold tabular-nums ${
                    g.passed ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {g.id}
                </span>
              </div>
            ))}
          </div>

          {/* Next Required Action Callout */}
          <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
            <Compass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-300" />
            <div>
              <span className="font-bold text-white">Next Required Action: </span>
              <span>{nextActionLabel}</span>
            </div>
          </div>
        </div>

        {/* Role-Aware Workflow Action Section */}
        <div className="border-b border-slate-200 bg-slate-50/90 p-4">
          {status === 'Handed Over' ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-emerald-950">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <Award className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Handover Accepted &amp; Locked</span>
              </div>
              <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
                Formally accepted into Delivery execution. All fields and checklists are locked in read-only mode to preserve handover integrity. Use{' '}
                <span className="font-semibold">Reset Demo Data</span> in the top bar to replay.
              </p>
            </div>
          ) : status === 'Ready for Delivery' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-indigo-900">
                  Delivery Sign-Off Decision
                </span>
                <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-800">
                  Awaiting Acceptance
                </span>
              </div>

              {isDeliveryOrOps ? (
                <div className="space-y-2.5">
                  <div>
                    <label
                      htmlFor="accept-note-input"
                      className="block text-[11px] font-semibold text-slate-700"
                    >
                      Optional Kickoff / Acceptance Note
                    </label>
                    <input
                      id="accept-note-input"
                      type="text"
                      value={acceptNote}
                      onChange={(e) => setAcceptNote(e.target.value)}
                      placeholder="e.g., Sprint 1 capacity confirmed for Monday kickoff"
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={isSaving || !isReady}
                      onClick={() => onAcceptHandover(acceptNote)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {isSaving
                          ? 'Accepting...'
                          : 'Accept & Complete Handover'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setShowRejectBox((prev) => !prev)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Send Back to Sales</span>
                    </button>
                  </div>

                  {showRejectBox && (
                    <form
                      onSubmit={handleConfirmSendBack}
                      className="mt-2 space-y-2.5 rounded-xl border border-rose-200 bg-rose-50/70 p-3.5"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                        <div>
                          <label
                            htmlFor="send-back-reason-textarea"
                            className="block text-xs font-bold text-rose-900"
                          >
                            Reason for Returning to Sales (Required, min 5 chars) *
                          </label>
                          <p className="text-[11px] text-rose-700">
                            Sending back transitions this handover to{' '}
                            <span className="font-semibold">Blocked</span> and records your note in the activity history.
                          </p>
                        </div>
                      </div>
                      {rejectError && (
                        <p className="text-xs font-semibold text-rose-700">
                          {rejectError}
                        </p>
                      )}
                      <textarea
                        id="send-back-reason-textarea"
                        rows={2}
                        required
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Explain what Sales needs to clarify or attach..."
                        className="w-full rounded-lg border border-rose-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowRejectBox(false);
                            setRejectError('');
                          }}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                        >
                          Confirm Send Back
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3.5 text-xs text-indigo-950 space-y-2.5">
                  <p className="font-medium leading-relaxed">
                    This handover is awaiting Delivery sign-off. Switch role to{' '}
                    <span className="font-bold text-emerald-800">
                      Priya Nair (Delivery Lead)
                    </span>{' '}
                    to accept responsibility or send it back to Sales.
                  </p>
                  {priyaPersona && onSelectUser && (
                    <button
                      type="button"
                      onClick={() => onSelectUser(priyaPersona)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 cursor-pointer"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Switch Persona to Priya Nair (Delivery Lead) →</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Status is Blocked or Draft */
            <div className="space-y-2.5">
              {!isReady ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-200/75 px-4 py-2.5 text-xs font-bold text-slate-600 cursor-not-allowed"
                  >
                    <Lock className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      Resolve {blockers.length} Blocker
                      {blockers.length === 1 ? '' : 's'} to Mark Ready for Delivery
                    </span>
                  </button>
                  {!isSalesOrOps && aaravPersona && onSelectUser && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-950 space-y-2">
                      <p className="font-medium">
                        Editing is restricted to Sales or Ops. Switch to{' '}
                        <span className="font-bold">Aarav Mehta (Sales)</span> to resolve blockers.
                      </p>
                      <button
                        type="button"
                        onClick={() => onSelectUser(aaravPersona)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Switch Persona to Aarav Mehta (Sales) →</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : isSalesOrOps ? (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={onMarkReady}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  <Rocket className="h-4 w-4" />
                  <span>
                    {isSaving
                      ? 'Transitioning...'
                      : 'Mark Ready for Delivery (6/6 Passed)'}
                  </span>
                </button>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-950 space-y-2">
                  <p className="font-semibold">
                    All 6/6 gates pass! Switch persona to{' '}
                    <span className="font-bold">Aarav Mehta (Sales)</span> or{' '}
                    <span className="font-bold">Vikram Desai (Ops)</span> to submit this handover as Ready for Delivery.
                  </p>
                  {aaravPersona && onSelectUser && (
                    <button
                      type="button"
                      onClick={() => onSelectUser(aaravPersona)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Switch Persona to Aarav Mehta (Sales) →</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Six Mandatory Readiness Gates Checklist */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Six Mandatory Readiness Gates
            </h3>
            <span className="text-[11px] font-medium text-slate-400">
              Deterministic Rule Check
            </span>
          </div>

          <div className="space-y-2.5">
            {gates.map((gate) => {
              if (gate.passed) {
                return (
                  <div
                    key={gate.id}
                    className="rounded-xl border border-slate-200 border-l-4 border-l-emerald-500 bg-slate-50/60 p-3 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 tabular-nums">
                              {gate.id}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900">
                              {gate.title}
                            </h4>
                          </div>
                          <p className="mt-1 text-[11px] font-medium text-slate-600">
                            {gate.currentStatusText}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        PASSED
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={gate.id}
                  className="rounded-xl border border-rose-200 border-l-4 border-l-rose-500 bg-white p-3.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-900 tabular-nums">
                            {gate.id}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">
                            {gate.title}
                          </h4>
                        </div>
                        <p className="mt-1 text-[11px] font-semibold text-rose-700">
                          {gate.currentStatusText}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                      BLOCKED
                    </span>
                  </div>

                  {/* Diagnostic & Remediation Box */}
                  <div className="mt-2.5 space-y-1.5 rounded-lg border border-slate-200/80 bg-slate-50/90 p-2.5 text-[11px]">
                    <p className="text-slate-700 leading-relaxed">
                      <span className="font-bold text-slate-900">
                        Why it blocks:{' '}
                      </span>
                      {gate.whyItBlocks}
                    </p>
                    <p className="text-slate-800 leading-relaxed">
                      <span className="font-bold text-indigo-700">
                        Action to resolve:{' '}
                      </span>
                      {gate.actionNeeded}
                    </p>
                  </div>

                  {onJumpToSection && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onJumpToSection(gate.sectionId, gate.id)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 hover:text-indigo-900 transition cursor-pointer"
                      >
                        <span>
                          {status !== 'Handed Over' && isSalesOrOps
                            ? `Jump to ${gate.id} field to fix`
                            : `Locate ${gate.id} section in workspace`}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
