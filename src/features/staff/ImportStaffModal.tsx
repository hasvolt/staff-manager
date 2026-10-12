import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useOrg } from '@/features/org/orgContext';
import {
  parseCSVText,
  getStaffImportTemplateCSV,
  validateStaffImport,
  executeStaffImport,
  rollbackImportBatch,
  ImportPreviewRow,
} from '@/lib/import/importService';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Users,
} from 'lucide-react';

interface ImportStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export const ImportStaffModal: React.FC<ImportStaffModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const { currentOrg } = useOrg();
  const { success, error, info } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    const csv = getStaffImportTemplateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'staff_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success('Template downloaded.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrg?.id) return;

    setIsValidating(true);
    const reader = new FileReader();

    reader.onerror = () => {
      setIsValidating(false);
      error('Failed to read CSV file. Please check file permissions or try another file.');
    };

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const { rows } = parseCSVText(text);
        const validated = await validateStaffImport(currentOrg.id, rows);
        setPreviewRows(validated);
        info(`Loaded ${validated.length} rows for review.`);
      } catch (err: any) {
        error(err.message || 'Failed to parse CSV file.');
      } finally {
        setIsValidating(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteImport = async () => {
    if (!currentOrg?.id || previewRows.length === 0) return;
    setIsImporting(true);

    try {
      const result = await executeStaffImport(currentOrg.id, previewRows);
      setLastBatchId(result.batchId);
      success(`Imported ${result.importedCount} staff members successfully!`);
      if (onImportComplete) onImportComplete();
    } catch (e: any) {
      error(e.message || 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRollback = async () => {
    if (!lastBatchId) return;
    if (!confirm('Roll back this entire import batch? All imported staff in this batch will be removed.')) return;

    try {
      const count = await rollbackImportBatch(lastBatchId);
      success(`Rollback complete: Removed ${count} imported staff members.`);
      setLastBatchId(null);
      setPreviewRows([]);
      if (onImportComplete) onImportComplete();
    } catch (e: any) {
      error(e.message || 'Rollback failed.');
    }
  };

  const validCount = previewRows.filter((r) => r.isValid).length;
  const invalidCount = previewRows.length - validCount;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Staff from CSV / Excel" maxWidth="lg">
      <div className="space-y-4">
        {/* Template download & upload action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
          <div>
            <span className="font-semibold text-xs text-[var(--text)] block">
              1. Download CSV Template
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              Includes pre-filled column headers and sample data
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="w-3.5 h-3.5 mr-1" />
            Download Template
          </Button>
        </div>

        {/* Upload box */}
        {!lastBatchId && previewRows.length === 0 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-6 text-center cursor-pointer transition space-y-2 bg-[var(--surface-2)]/30"
          >
            <Upload className="w-8 h-8 text-[var(--accent)] mx-auto" />
            <div className="text-xs font-semibold text-[var(--text)]">
              Click to select a completed CSV file
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              Automatic validation and duplicate phone/name detection
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,application/vnd.ms-excel,text/plain"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* Preview and Validation */}
        {previewRows.length > 0 && !lastBatchId && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm">
                  {validCount} Ready to import
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="expense" size="sm">
                    {invalidCount} Errors
                  </Badge>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewRows([])}
                className="text-xs text-[var(--text-muted)] hover:underline"
              >
                Clear file
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl bg-[var(--surface)] text-xs">
              {previewRows.map((row) => (
                <div key={row.index} className="p-2.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-[var(--text)]">{row.data.name}</span>
                    <span className="text-[11px] text-[var(--text-muted)] ml-2">
                      {row.data.designation || 'Staff'} &bull; {row.data.phone || 'No Phone'} &bull; {row.data.payment_type} (Rate: {row.data.rate})
                    </span>
                    {row.isDuplicate && (
                      <span className="ml-2 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Possible duplicate
                      </span>
                    )}
                  </div>
                  {row.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <div className="text-[10px] text-red-500 font-medium">
                      {row.errors.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="primary"
              className="w-full"
              disabled={validCount === 0}
              onClick={handleExecuteImport}
              isLoading={isImporting}
            >
              <Users className="w-4 h-4 mr-1.5" />
              Import {validCount} Staff Members
            </Button>
          </div>
        )}

        {/* Rollback confirmation screen */}
        {lastBatchId && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Import Successful</span>
            </div>
            <p className="text-xs text-[var(--text)]">
              All staff members from the CSV file have been added to your business. You can roll back this import batch if you noticed any mistakes.
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="expense" size="sm" onClick={handleRollback}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Rollback Import Batch
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
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
