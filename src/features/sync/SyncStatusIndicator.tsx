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
        className="h-9 sm:h-10 px-2 sm:px-2.5 rounded-xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface)] transition-all duration-150 active:scale-90 cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
        title="Sync Status Details"
        aria-label="Sync Status Details"
      >
        {renderBadge()}
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cloud Sync & Outbox Status"
        maxWidth="sm"
      >
        <div className="space-y-4 text-left">
          <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between">
            <div>
              <span className="text-xs text-[var(--text-muted)] font-medium">Current Status</span>
              <div className="text-sm font-bold text-[var(--text)] mt-0.5 capitalize">
                {state === 'synced'
                  ? 'All changes synced to cloud'
                  : state === 'syncing'
                  ? 'Syncing changes in background'
                  : state === 'offline'
                  ? 'Offline mode (saves to device)'
                  : 'Sync attention needed'}
              </div>
            </div>
            {renderBadge()}
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--border)] text-xs flex justify-between items-center">
            <span className="text-[var(--text-muted)]">Pending outbox changes:</span>
            <span className="font-bold text-[var(--text)]">{outboxCount} records</span>
          </div>

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

          <div className="pt-2 flex items-center justify-end gap-2">
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
