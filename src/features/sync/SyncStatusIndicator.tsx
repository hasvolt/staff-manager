import React, { useState, useEffect } from 'react';
import { syncEngine, SyncState } from '@/lib/sync/syncEngine';
import { useOrg } from '@/features/org/orgContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { localDb } from '@/lib/db/dexie';
import { RefreshCw, CheckCircle2, WifiOff, AlertTriangle, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export const SyncStatusIndicator: React.FC = () => {
  const { currentOrg } = useOrg();
  const { success, error } = useToast();

  const [state, setState] = useState<SyncState>(syncEngine.getState());
  const [lastError, setLastError] = useState<string | null>(syncEngine.getLastError());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [outboxCount, setOutboxCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return syncEngine.subscribe((newState, err) => {
      setState(newState);
      setLastError(err || null);
    });
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      localDb.outbox.count().then(setOutboxCount);
    }
  }, [isModalOpen, state]);

  const handleSyncNow = async () => {
    const res = await syncEngine.syncNow(currentOrg?.id);
    if (res.success) {
      success('Sync complete!');
    } else {
      error(res.message);
    }
    const count = await localDb.outbox.count();
    setOutboxCount(count);
  };

  const handleCopyError = () => {
    if (lastError) {
      navigator.clipboard.writeText(lastError);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderBadge = () => {
    if (state === 'syncing') {
      return (
        <span className="flex items-center gap-1.5 text-xs text-[var(--accent)] font-semibold">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span className="hidden sm:inline">Syncing...</span>
        </span>
      );
    }
    if (state === 'offline') {
      return (
        <span className="flex items-center gap-1.5 text-xs text-[var(--warning)] font-semibold">
          <WifiOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Offline</span>
        </span>
      );
    }
    if (state === 'error') {
      return (
        <span className="flex items-center gap-1.5 text-xs text-[var(--expense)] font-semibold">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sync Issue</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs text-[var(--income)] font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Synced</span>
      </span>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="h-8.5 sm:h-9 px-2 sm:px-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface)] transition-all duration-150 active:scale-90 cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
        title="Sync Status Details"
        aria-label="Sync Status Details"
      >
        {renderBadge()}
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[var(--accent)]" />
            <span>Cloud & Local Sync Engine</span>
          </div>
        }
        maxWidth="md"
      >
        <div className="space-y-4 text-left">
          {/* Main Status Header Card */}
          <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-3">
            <div>
              <span className="text-xs text-[var(--text-muted)] font-medium">Sync Status</span>
              <div className="text-sm font-bold text-[var(--text)] mt-0.5 capitalize">
                {state === 'synced'
                  ? 'All changes safely synced to cloud'
                  : state === 'syncing'
                  ? 'Syncing in background...'
                  : state === 'offline'
                  ? 'Offline mode (Safe local-first)'
                  : 'Attention needed'}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {state === 'synced' && 'IndexedDB local cache and Supabase cloud database are 100% in sync.'}
                {state === 'syncing' && 'Uploading outbox changes and fetching recent updates from server.'}
                {state === 'offline' && 'Internet disconnected. All attendance and payment records are saved to your phone/PC.'}
                {state === 'error' && 'Failed to connect to cloud. Data is safe locally in queue.'}
              </p>
            </div>
            <div className="shrink-0">{renderBadge()}</div>
          </div>

          {/* Sync Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--border)]">
              <span className="text-[var(--text-muted)] block text-[11px]">Unsent Outbox Queue</span>
              <span className="font-bold text-sm text-[var(--text)] mt-0.5 block">
                {outboxCount} {outboxCount === 1 ? 'record' : 'records'}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                {outboxCount === 0 ? 'Queue is clear' : 'Will push automatically'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--border)]">
              <span className="text-[var(--text-muted)] block text-[11px]">Network Connection</span>
              <span className="font-bold text-sm text-[var(--text)] mt-0.5 block flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${navigator.onLine ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {navigator.onLine ? 'Online' : 'Offline'}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                {navigator.onLine ? 'Realtime sync active' : 'Working on local storage'}
              </span>
            </div>
          </div>

          {/* Educational Explain Box */}
          <div className="p-3.5 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-xs text-[var(--text)] space-y-1.5">
            <div className="font-bold text-[var(--accent)] flex items-center gap-1.5">
              <span>What is this Synced feature?</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Staff Manager uses an <strong>Offline-First (Local-First)</strong> architecture. Even if your internet disconnects, you can still mark daily attendance, add payments, and view staff registers without getting blocked.
            </p>
            <ul className="text-[11px] text-[var(--text-muted)] list-disc pl-4 space-y-0.5">
              <li><strong>Local Storage:</strong> Everything is instantly saved to your device’s fast IndexedDB.</li>
              <li><strong>Outbox Queue:</strong> Every change is queued so no records ever get lost.</li>
              <li><strong>Auto Sync:</strong> Whenever internet reconnects, changes sync to Supabase cloud database automatically.</li>
            </ul>
          </div>

          {/* Last Error Details if any */}
          {lastError && (
            <div className="p-3 rounded-xl bg-[var(--expense)]/10 border border-[var(--expense)]/20 text-xs space-y-2">
              <div className="flex items-center justify-between text-[var(--expense)] font-semibold">
                <span>Sync Error Details</span>
                <button
                  type="button"
                  onClick={handleCopyError}
                  className="flex items-center gap-1 hover:underline"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-[11px] text-[var(--text-muted)] break-all">{lastError}</p>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border)]">
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSyncNow}
              isLoading={state === 'syncing'}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Now</span>
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
