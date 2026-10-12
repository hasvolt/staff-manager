import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useOrg } from '@/features/org/orgContext';
import {
  exportBusinessData,
  downloadBackupFile,
  restoreBusinessData,
  BusinessBackupPayload,
} from '@/lib/backup/backupService';
import {
  Download,
  Upload,
  Database,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ isOpen, onClose }) => {
  const { currentOrg, reloadOrganizations } = useOrg();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [isExporting, setIsExporting] = useState(false);

  // Restore states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedPayload, setImportedPayload] = useState<BusinessBackupPayload | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'restore_as_new'>('merge');
  const [newOrgName, setNewOrgName] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const handleDownloadBackup = async () => {
    if (!currentOrg?.id) return;
    setIsExporting(true);
    try {
      const payload = await exportBusinessData(currentOrg.id);
      downloadBackupFile(payload);
      success('Full business backup downloaded successfully.');
    } catch (e: any) {
      error(e.message || 'Failed to generate backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onerror = () => {
      error('Failed to read backup file. Please check file permissions or try again.');
    };

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as BusinessBackupPayload;
        if (!parsed.data || !parsed.version) {
          throw new Error('Not a valid Staff Manager backup JSON file.');
        }
        setImportedPayload(parsed);
        setNewOrgName(`${parsed.sourceOrgName} (Restored)`);
        info(`Backup file loaded: ${parsed.sourceOrgName}`);
      } catch (err: any) {
        error(err.message || 'Failed to read backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteRestore = async () => {
    if (!importedPayload || !currentOrg?.id) return;
    setIsRestoring(true);

    try {
      const res = await restoreBusinessData(importedPayload, {
        mode: restoreMode,
        targetOrgId: currentOrg.id,
        newBusinessName: newOrgName,
      });

      success(
        `Restored successfully: ${res.stats.staff} staff, ${res.stats.attendance} attendance records, ${res.stats.payments} payments.`
      );
      await reloadOrganizations();
      setImportedPayload(null);
      onClose();
    } catch (e: any) {
      error(e.message || 'Restore failed.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Backup & Restore Business Data" maxWidth="md">
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border)] gap-2 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'backup'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Backup</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'restore'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restore Backup</span>
          </button>
        </div>

        {/* 1. BACKUP TAB */}
        {activeTab === 'backup' && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-2">
              <div className="flex items-center gap-2 text-[var(--text)] font-semibold text-sm">
                <Database className="w-4 h-4 text-[var(--accent)]" />
                <span>Full JSON Snapshot</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Exports all business data (Staff profiles, daily attendance, payments, advance history, custom sites, and business settings) into a portable JSON file.
              </p>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleDownloadBackup}
              isLoading={isExporting}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Full Backup (.json)
            </Button>
          </div>
        )}

        {/* 2. RESTORE TAB */}
        {activeTab === 'restore' && (
          <div className="space-y-3.5">
            {!importedPayload ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-6 text-center cursor-pointer transition space-y-2 bg-[var(--surface-2)]/30"
              >
                <Upload className="w-8 h-8 text-[var(--accent)] mx-auto" />
                <div className="text-xs font-semibold text-[var(--text)]">
                  Click to select a backup JSON file
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Supports valid Staff Manager backup files
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json,text/plain"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="space-y-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                  <span className="text-xs font-bold text-[var(--text)]">Backup File Preview</span>
                  <button
                    type="button"
                    onClick={() => setImportedPayload(null)}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    Change File
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-[var(--surface)]">
                    <span className="block font-bold text-[var(--text)]">
                      {importedPayload.metadata?.totalStaff || 0}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">Staff</span>
                  </div>
                  <div className="p-2 rounded bg-[var(--surface)]">
                    <span className="block font-bold text-[var(--text)]">
                      {importedPayload.metadata?.totalAttendance || 0}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">Attendance</span>
                  </div>
                  <div className="p-2 rounded bg-[var(--surface)]">
                    <span className="block font-bold text-[var(--text)]">
                      {importedPayload.metadata?.totalPayments || 0}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">Payments</span>
                  </div>
                </div>

                {/* Restore Mode selection */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-[var(--text)] block">
                    Restore Destination:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setRestoreMode('merge')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                        restoreMode === 'merge'
                          ? 'border-[var(--accent)] bg-[var(--surface)] text-[var(--text)]'
                          : 'border-[var(--border)] text-[var(--text-muted)]'
                      }`}
                    >
                      <strong className="block">Merge</strong>
                      <span className="text-[10px]">Add into current business</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestoreMode('restore_as_new')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                        restoreMode === 'restore_as_new'
                          ? 'border-[var(--accent)] bg-[var(--surface)] text-[var(--text)]'
                          : 'border-[var(--border)] text-[var(--text-muted)]'
                      }`}
                    >
                      <strong className="block">New Business</strong>
                      <span className="text-[10px]">Create separate business</span>
                    </button>
                  </div>

                  {restoreMode === 'restore_as_new' && (
                    <FormField label="New Business Name">
                      <Input
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        placeholder="Restored Business Name"
                      />
                    </FormField>
                  )}
                </div>

                <Button
                  variant="primary"
                  className="w-full mt-2"
                  onClick={handleExecuteRestore}
                  isLoading={isRestoring}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Execute Restore
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-[var(--border)]">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
