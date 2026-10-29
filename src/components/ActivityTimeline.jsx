import React from 'react';
import {
  History,
  Clock,
  Info,
  ArrowRightCircle,
  RotateCcw,
  Award,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

const ROLE_BADGE_MAP = {
  sales: {
    label: 'Sales',
    classes: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  delivery: {
    label: 'Delivery',
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  ops: {
    label: 'Ops',
    classes: 'bg-amber-50 text-amber-900 border-amber-200',
  },
};

function formatTimestamp(isoString) {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function classifyActivityEntry(actionText = '') {
  const text = String(actionText);

  // Extract optional Reason: "..." or Delivery kickoff note: "..."
  let headline = text;
  let sendBackReason = null;
  let kickoffNote = null;

  const reasonMatch = text.match(/^(.*?)\s*Reason:\s*"([\s\S]*)"$/);
  if (reasonMatch) {
    headline = reasonMatch[1].trim();
    sendBackReason = reasonMatch[2].trim();
  }

  const noteMatch = text.match(/^(.*?)\s*Delivery kickoff note:\s*"([\s\S]*)"$/);
  if (noteMatch) {
    headline = noteMatch[1].trim();
    kickoffNote = noteMatch[2].trim();
  }

  if (text.includes('Sent handover back to Sales')) {
    return {
      headline,
      sendBackReason,
      kickoffNote,
      badge: {
        label: 'Returned → Blocked',
        classes: 'border-rose-200 bg-rose-50 text-rose-800',
        Icon: RotateCcw,
      },
      dotClass: 'bg-rose-600 ring-2 ring-rose-100',
      cardClass: 'border-rose-200/80 bg-rose-50/30',
    };
  }

  if (text.includes('Auto-downgraded')) {
    return {
      headline,
      sendBackReason,
      kickoffNote,
      badge: {
        label: 'Auto-Downgraded → Blocked',
        classes: 'border-amber-300 bg-amber-50 text-amber-900',
        Icon: AlertTriangle,
      },
      dotClass: 'bg-amber-500 ring-2 ring-amber-100',
      cardClass: 'border-amber-200/80 bg-amber-50/30',
    };
  }

  if (
    text.includes('Accepted handover') ||
    text.includes('Status is now Handed Over')
  ) {
    return {
      headline,
      sendBackReason,
      kickoffNote,
      badge: {
        label: 'Transition → Handed Over',
        classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        Icon: Award,
      },
      dotClass: 'bg-emerald-600 ring-2 ring-emerald-100',
      cardClass: 'border-emerald-200/80 bg-emerald-50/30',
    };
  }

  if (text.includes('Marked handover Ready for Delivery')) {
    return {
      headline,
      sendBackReason,
      kickoffNote,
      badge: {
        label: 'Transition → Ready for Delivery',
        classes: 'border-indigo-200 bg-indigo-50 text-indigo-800',
        Icon: ArrowRightCircle,
      },
      dotClass: 'bg-indigo-600 ring-2 ring-indigo-100',
      cardClass: 'border-indigo-200/80 bg-indigo-50/30',
    };
  }

  if (
    text.includes('satisfied') ||
    text.includes('Verified & resolved')
  ) {
    return {
      headline,
      sendBackReason,
      kickoffNote,
      badge: {
        label: 'Gate Satisfied',
        classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        Icon: CheckCircle2,
      },
      dotClass: null,
      cardClass: 'border-slate-200/80 bg-slate-50/60',
    };
  }

  return {
    headline,
    sendBackReason,
    kickoffNote,
    badge: null,
    dotClass: null,
    cardClass: 'border-slate-200/80 bg-slate-50/60',
  };
}

export default function ActivityTimeline({ logs = [] }) {
  const safeLogs = Array.isArray(logs) ? logs : [];

  return (
    <section
      id="section-activity"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              6. Handover Activity &amp; Audit History
            </h2>
            <p className="text-xs text-slate-500">
              Chronological record of status transitions, blocker resolutions, and ownership sign-offs
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          <Info className="h-3.5 w-3.5 text-slate-400" />
          <span>Application-Level Demo History ({safeLogs.length})</span>
        </span>
      </div>

      {safeLogs.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">
          No activity entries recorded yet.
        </p>
      ) : (
        <ol className="mt-4 relative border-l-2 border-slate-200 ml-3 space-y-3.5">
          {safeLogs.map((entry, idx) => {
            const roleMeta =
              ROLE_BADGE_MAP[entry.actor_role] || ROLE_BADGE_MAP.ops;
            const isLatest = idx === 0;
            const meta = classifyActivityEntry(entry.action);
            const BadgeIcon = meta.badge?.Icon;

            const dotColor =
              meta.dotClass ||
              (isLatest
                ? 'bg-indigo-600 ring-2 ring-indigo-100'
                : 'bg-slate-300');

            return (
              <li key={entry.id || idx} className="ml-5 relative">
                <span
                  className={`-left-[27px] top-2.5 absolute h-3 w-3 rounded-full border-2 border-white ${dotColor}`}
                />
                <div
                  className={`rounded-xl border p-3.5 transition ${meta.cardClass}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {entry.actor_name || 'System'}
                      </span>
                      <span
                        className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${roleMeta.classes}`}
                      >
                        {roleMeta.label}
                      </span>
                      {meta.badge && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${meta.badge.classes}`}
                        >
                          {BadgeIcon && <BadgeIcon className="h-3 w-3" />}
                          <span>{meta.badge.label}</span>
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 tabular-nums">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs font-medium text-slate-700 leading-relaxed">
                    {meta.headline}
                  </p>

                  {meta.sendBackReason && (
                    <div className="mt-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs text-rose-900">
                      <span className="font-bold text-rose-800">
                        Send-Back Reason:{' '}
                      </span>
                      <span>“{meta.sendBackReason}”</span>
                    </div>
                  )}

                  {meta.kickoffNote && (
                    <div className="mt-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-900">
                      <span className="font-bold text-emerald-800">
                        Delivery Kickoff Note:{' '}
                      </span>
                      <span>“{meta.kickoffNote}”</span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
