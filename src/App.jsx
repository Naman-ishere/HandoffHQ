import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  HardDrive,
  Loader2,
} from 'lucide-react';
import { DEFAULT_DEMO_USER } from './constants/demoUsers.js';
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
} from './services/handoverService.js';
import Navbar from './components/Navbar.jsx';
import DashboardView from './components/DashboardView.jsx';
import HandoverWorkspace from './components/HandoverWorkspace.jsx';

export default function App() {
  const [activeUser, setActiveUser] = useState(DEFAULT_DEMO_USER);
  const [handovers, setHandovers] = useState([]);
  const [storageMode, setStorageMode] = useState(STORAGE_MODES.LOCAL_DEMO);
  const [selectedHandoverId, setSelectedHandoverId] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [warningBanner, setWarningBanner] = useState(null);
  const [cloudWriteError, setCloudWriteError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    async function boot() {
      setIsLoading(true);
      try {
        const res = await initAndListHandovers();
        if (!mounted) return;
        setHandovers(res.handovers || []);
        setStorageMode(res.mode);
        if (res.warning) {
          setWarningBanner(res.warning);
        }
      } catch (err) {
        if (!mounted) return;
        setWarningBanner(
          err.message || 'Failed to initialize storage. Using Local Demo Mode.'
        );
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    boot();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedHandover = useMemo(
    () => handovers.find((h) => h.id === selectedHandoverId) || null,
    [handovers, selectedHandoverId]
  );

  function updateHandoverInState(updatedRecord) {
    setHandovers((prev) => {
      const exists = prev.some((h) => h.id === updatedRecord.id);
      if (!exists) return [updatedRecord, ...prev];
      return prev.map((h) => (h.id === updatedRecord.id ? updatedRecord : h));
    });
  }

  function handleSelectPersona(user) {
    setActiveUser(user);
    showToast(
      'info',
      `Switched active demo persona to ${user.name} (${user.title}).`
    );
  }

  async function handleResetDemo() {
    setIsResetting(true);
    setCloudWriteError(null);
    try {
      const res = await resetDemoData();
      setHandovers(res.handovers || []);
      setStorageMode(res.mode);
      showToast(
        'success',
        'Demo data reset! "Acme Website Redesign" restored to Blocked (3/6 gates passed).'
      );
    } catch (err) {
      if (err.isCloudWriteError) {
        setCloudWriteError(err.message);
      }
      showToast('error', err.message || 'Failed to reset demo data.');
    } finally {
      setIsResetting(false);
    }
  }

  function handleExplicitSwitchToLocal() {
    const res = switchToLocalMode(handovers);
    setStorageMode(res.mode);
    setHandovers(res.handovers);
    setCloudWriteError(null);
    showToast(
      'info',
      'Switched to LOCAL_DEMO mode (localStorage). You can now save changes offline.'
    );
  }

  async function handleCreateHandover(formData) {
    setIsSaving(true);
    setCloudWriteError(null);
    try {
      const created = await createHandover(formData, activeUser);
      updateHandoverInState(created);
      showToast(
        'success',
        `Created handover "${created.project_name}" for ${created.client_name}.`
      );
      return created;
    } catch (err) {
      if (err.isCloudWriteError) {
        setCloudWriteError(err.message);
      }
      showToast('error', err.message || 'Could not create handover.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveChanges(updates, logAction) {
    if (!selectedHandover) return;
    const previousStatus = selectedHandover.status;
    setIsSaving(true);
    setCloudWriteError(null);
    try {
      const updated = await saveHandoverChanges(
        selectedHandover.id,
        updates,
        logAction,
        activeUser
      );
      updateHandoverInState(updated);

      if (
        previousStatus === 'Ready for Delivery' &&
        updated.status === 'Blocked'
      ) {
        showToast(
          'error',
          'Readiness gate invalidated! Handover status automatically downgraded from Ready for Delivery to Blocked.'
        );
      } else {
        showToast(
          'success',
          `${logAction} (${updated.readiness.passedCount}/6 gates passed)`
        );
      }
      return updated;
    } catch (err) {
      if (err.isCloudWriteError) {
        setCloudWriteError(err.message);
      }
      showToast('error', err.message || 'Failed to save changes.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkReady() {
    if (!selectedHandover) return;
    setIsSaving(true);
    setCloudWriteError(null);
    try {
      const updated = await markReadyForDelivery(
        selectedHandover.id,
        activeUser
      );
      updateHandoverInState(updated);
      showToast(
        'success',
        'Marked "Ready for Delivery" (6/6 gates verified)! Switch to Priya Nair (Delivery Lead) to accept.'
      );
      return updated;
    } catch (err) {
      if (err.isCloudWriteError) {
        setCloudWriteError(err.message);
      }
      showToast('error', err.message || 'Could not mark Ready for Delivery.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAcceptHandover(note) {
    if (!selectedHandover) return;
    setIsSaving(true);
    setCloudWriteError(null);
    try {
      const updated = await acceptHandover(
        selectedHandover.id,
        activeUser,
        note
      );
      updateHandoverInState(updated);
      showToast(
        'success',
        'Handover formally accepted into Delivery execution! Status locked as "Handed Over".'
      );
      return updated;
    } catch (err) {
      if (err.isCloudWriteError) {
        setCloudWriteError(err.message);
      }
      showToast('error', err.message || 'Could not accept handover.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReturnToSales(reason) {
    if (!selectedHandover) return;
    setIsSaving(true);
    setCloudWriteError(null);
    try {
      const updated = await returnToSales(
        selectedHandover.id,
        activeUser,
        reason
      );
      updateHandoverInState(updated);
      showToast(
        'info',
        'Handover sent back to Sales (Status reverted to Blocked).'
      );
      return updated;
    } catch (err) {
      if (err.isCloudWriteError) {
        setCloudWriteError(err.message);
      }
      showToast('error', err.message || 'Could not return handover to Sales.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        activeUser={activeUser}
        onSelectUser={handleSelectPersona}
        storageMode={storageMode}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
        onNavigateHome={() => setSelectedHandoverId(null)}
      />

      {/* Fallback / Connection Warning Banner */}
      {warningBanner && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-950">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{warningBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setWarningBanner(null)}
              className="rounded p-1 text-amber-700 hover:bg-amber-100 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Honest Cloud Save Error Banner with Explicit Switch to Local Mode */}
      {cloudWriteError && (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-950">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{cloudWriteError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExplicitSwitchToLocal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-800 cursor-pointer"
              >
                <HardDrive className="h-3.5 w-3.5" />
                <span>Switch to Offline Local Mode (LOCAL_DEMO)</span>
              </button>
              <button
                type="button"
                onClick={() => setCloudWriteError(null)}
                className="rounded p-1 text-rose-700 hover:bg-rose-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in fade-in slide-in-from-bottom-3">
          <div
            className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg ${
              toast.type === 'error'
                ? 'border-rose-200 bg-rose-950 text-white'
                : toast.type === 'success'
                  ? 'border-emerald-200 bg-slate-900 text-white'
                  : 'border-indigo-200 bg-slate-900 text-white'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            ) : toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <Info className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
            )}
            <span className="leading-relaxed">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {isLoading ? (
          <div className="flex h-80 flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            <p className="text-xs font-semibold">
              Loading HandoffHQ Command Center &amp; Readiness Engine...
            </p>
          </div>
        ) : selectedHandover ? (
          <HandoverWorkspace
            handover={selectedHandover}
            activeUser={activeUser}
            onBack={() => setSelectedHandoverId(null)}
            onSaveChanges={handleSaveChanges}
            onMarkReady={handleMarkReady}
            onAcceptHandover={handleAcceptHandover}
            onReturnToSales={handleReturnToSales}
            onSelectUser={handleSelectPersona}
            isSaving={isSaving}
          />
        ) : (
          <DashboardView
            handovers={handovers}
            activeUser={activeUser}
            onSelectHandover={(id) => setSelectedHandoverId(id)}
            onCreateHandover={handleCreateHandover}
            isSaving={isSaving}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <span>
            <strong>HandoffHQ</strong> — Sales-to-Delivery Handover Command Center (Deterministic 6-Gate Readiness Engine)
          </span>
          <span>
            Mode: <strong className="text-slate-700">{storageMode}</strong> • Demo Persona:{' '}
            <strong className="text-slate-700">
              {activeUser.name} ({activeUser.badgeLabel})
            </strong>
          </span>
        </div>
      </footer>
    </div>
  );
}

