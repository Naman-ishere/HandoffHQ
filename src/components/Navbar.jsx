import React, { useState } from 'react';
import {
  ShieldCheck,
  RotateCcw,
  Database,
  HardDrive,
  UserCheck,
  Check,
  X,
} from 'lucide-react';
import { DEMO_USERS } from '../constants/demoUsers.js';
import { STORAGE_MODES } from '../services/handoverService.js';

const ROLE_STYLES = {
  sales: {
    active:
      'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/30 border-indigo-600',
    inactive:
      'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-slate-200',
    dot: 'bg-indigo-500',
    activeBadge: 'bg-indigo-800/80 text-indigo-100',
    inactiveBadge: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
  },
  delivery: {
    active:
      'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/30 border-emerald-600',
    inactive:
      'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-slate-200',
    dot: 'bg-emerald-500',
    activeBadge: 'bg-emerald-800/80 text-emerald-100',
    inactiveBadge: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  },
  ops: {
    active:
      'bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/30 border-amber-600',
    inactive:
      'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-slate-200',
    dot: 'bg-amber-500',
    activeBadge: 'bg-amber-800/80 text-amber-100',
    inactiveBadge: 'bg-amber-50 text-amber-800 border border-amber-200/80',
  },
};

export default function Navbar({
  activeUser,
  onSelectUser,
  storageMode,
  onResetDemo,
  isResetting,
  onNavigateHome,
}) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const isCloud = storageMode === STORAGE_MODES.SUPABASE_CONNECTED;

  async function handleConfirmReset() {
    setConfirmingReset(false);
    await onResetDemo();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-2.5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        {/* Left: Brand Identity & Persistence Mode */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNavigateHome}
              aria-label="Go to HandoffHQ Command Center Dashboard"
              className="group flex items-center gap-2.5 rounded-xl text-left transition cursor-pointer"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs transition group-hover:bg-indigo-700">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-tight text-slate-950">
                    HandoffHQ
                  </span>
                  <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold tracking-tight text-indigo-700">
                    6-Gate Readiness Engine
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">
                  Sales-to-Delivery Handover Command Center
                </p>
              </div>
            </button>

            <div className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />

            {/* Persistence Mode Indicator */}
            <div
              role="status"
              aria-label={`Persistence mode: ${
                isCloud
                  ? 'SUPABASE_CONNECTED (Cloud Database)'
                  : 'LOCAL_DEMO (Browser LocalStorage)'
              }`}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                isCloud
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-100 text-slate-700'
              }`}
              title={
                isCloud
                  ? 'SUPABASE_CONNECTED: Syncing with Supabase PostgreSQL public demo table'
                  : 'LOCAL_DEMO: Persisting in browser localStorage (no external database required)'
              }
            >
              {isCloud ? (
                <>
                  <Database className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span>SUPABASE_CONNECTED</span>
                </>
              ) : (
                <>
                  <HardDrive className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                  <span>LOCAL_DEMO</span>
                  <span className="hidden text-[10px] font-normal text-slate-500 sm:inline">
                    (Browser Storage)
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Demo Persona Switcher & Demo Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 lg:justify-end">
          {/* Persona Switcher */}
          <div
            role="group"
            aria-label="Demo Persona Selector"
            className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-100/90 p-1"
          >
            <span className="hidden items-center gap-1 px-2 text-[11px] font-semibold text-slate-500 xl:inline-flex">
              <UserCheck className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span>Persona:</span>
            </span>
            {DEMO_USERS.map((user) => {
              const isSelected = activeUser?.id === user.id;
              const style = ROLE_STYLES[user.role] || ROLE_STYLES.sales;
              return (
                <button
                  key={user.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectUser(user)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition cursor-pointer ${
                    isSelected ? style.active : style.inactive
                  }`}
                  title={`Switch demo persona to ${user.name} — ${user.title} (${user.badgeLabel})`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isSelected ? 'bg-white' : style.dot
                    }`}
                    aria-hidden="true"
                  />
                  <span className="font-semibold tracking-tight">
                    {user.name}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isSelected ? style.activeBadge : style.inactiveBadge
                    }`}
                  >
                    {user.badgeLabel}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Demo Reset Control */}
          {confirmingReset ? (
            <div
              role="group"
              aria-label="Confirm Demo Reset"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs"
            >
              <span className="font-semibold text-amber-900">
                Reset all 4 deals?
              </span>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmReset}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Confirm</span>
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setConfirmingReset(false)}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cancel</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              disabled={isResetting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
              title="Restore all 4 seeded demo handovers (resets Acme Website Redesign to Blocked at 3/6 gates)"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 text-slate-500 ${
                  isResetting ? 'animate-spin' : ''
                }`}
                aria-hidden="true"
              />
              <span>{isResetting ? 'Resetting...' : 'Reset Demo Data'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
