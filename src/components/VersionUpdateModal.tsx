import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { useAppUpdate } from '@/lib/pwa/useAppUpdate';
import { useToast } from '@/components/ui/Toast';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  DownloadCloud,
  Layers,
  ShieldCheck,
  Zap,
  Users,
  Smartphone,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface VersionUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VersionUpdateModal: React.FC<VersionUpdateModalProps> = ({ isOpen, onClose }) => {
  const {
    currentVersion,
    buildDate,
    isChecking,
    updateAvailable,
    lastChecked,
    autoUpdate,
    setAutoUpdate,
    checkForUpdate,
    applyUpdate,
    forceRefreshCache,
  } = useAppUpdate();

  const { success, info } = useToast();
  const [hasCheckedManually, setHasCheckedManually] = useState(false);

  const handleManualCheck = async () => {
    setHasCheckedManually(true);
    const result = await checkForUpdate();
    if (result.hasUpdate) {
      info('New version found! Click "Update Now" to install.');
    } else {
      success('Staff Manager is up to date! (v' + currentVersion + ')');
    }
  };

  const handleApplyUpdate = async () => {
    success('Installing update and reloading...');
    await applyUpdate();
  };

  const handleForceRefresh = async () => {
    success('Clearing cache and reloading app...');
    await forceRefreshCache();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="App Version & Updates / वर्शन अपडेट"
      maxWidth="lg"
    >
      <div className="space-y-4 text-left">
        {/* Main Version Banner */}
        <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[var(--text)]">Staff Manager</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)] font-bold">
                  v{currentVersion}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Build: {buildDate} • PWA Offline-First
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {updateAvailable ? (
              <Button
                type="button"
                variant="income"
                size="sm"
                onClick={handleApplyUpdate}
                className="flex items-center gap-1.5 text-xs font-bold"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Update Now (नया वर्शन)</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleManualCheck}
                isLoading={isChecking}
                className="flex items-center gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Check for Updates</span>
              </Button>
            )}
          </div>
        </div>

        {/* Update Status Alert */}
        {updateAvailable ? (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-emerald-400">New Update Ready to Install!</p>
              <p className="text-[11px] text-[var(--text)] mt-0.5 leading-relaxed">
                A fresh update is ready. Click "Update Now" to restart the app with the latest enhancements without losing any of your saved data.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-[var(--surface-2)]/50 border border-[var(--border)] flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-[var(--text)]">You are running the latest version</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {lastChecked
                  ? `Last verified at ${lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Automated background update checking is active.'}
              </p>
            </div>
          </div>
        )}

        {/* What's New in this Version */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              What's New in v{currentVersion} / इस वर्शन के नए फीचर्स
            </span>
            <span className="text-[10px] text-[var(--accent)] font-semibold">Latest Release Notes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border)] flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-[var(--text)]">Account Switcher (खाता बदलें)</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Seamlessly switch between multiple accounts or businesses on this device with 1 tap.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border)] flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-[var(--text)]">Instant Attendance Shortcut</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  1-tap Present, Half-day, and Absent markers directly from homepage and attendance register.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border)] flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-[var(--text)]">Responsive Mobile Layout</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Zero horizontal overflow, tactile big buttons, and safe-area mobile navigation.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border)] flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-[var(--text)]">Bilingual Statements & Slips</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Generate professional salary slips, attendance registers, and PDF/CSV statements.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Update Preferences & Advanced Cache Utilities */}
        <div className="p-3.5 rounded-2xl bg-[var(--surface-2)]/30 border border-[var(--border)] space-y-3">
          <Switch
            label="Automatic Updates (स्वचालित अपडेट)"
            description="Automatically install new builds in the background when available."
            checked={autoUpdate}
            onChange={() => setAutoUpdate(!autoUpdate)}
          />

          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--text)]">Troubleshoot & Clear Offline Cache</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                Forces a clean reload of all application code while keeping your stored records safe.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleForceRefresh}
              className="text-xs shrink-0"
            >
              Clear & Refresh
            </Button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
