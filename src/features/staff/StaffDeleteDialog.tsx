import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { LocalStaff } from '@/lib/db/dexie';
import { staffRepo } from '@/lib/db/repository';
import { useToast } from '@/components/ui/Toast';
import { AlertTriangle, Archive, Trash2 } from 'lucide-react';

interface StaffDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staff: LocalStaff | null;
  hasHistory: boolean;
  requireOwnerApproval?: boolean;
  onCompleted: () => void;
}

export const StaffDeleteDialog: React.FC<StaffDeleteDialogProps> = ({
  isOpen,
  onClose,
  staff,
  hasHistory,
  requireOwnerApproval = false,
  onCompleted,
}) => {
  const { showToast, success, error } = useToast();
  const [mode, setMode] = useState<'choose' | 'trash'>('choose');
  const [confirmName, setConfirmName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!staff) return null;

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      await staffRepo.update(staff.id, { status: 'inactive' });
      showToast(`Archived "${staff.name}".`, 'info', {
        label: 'Undo',
        onClick: async () => {
          await staffRepo.update(staff.id, { status: 'active' });
          success(`Restored active status for "${staff.name}"`);
          onCompleted();
        },
      });
      onCompleted();
      onClose();
    } catch (err: any) {
      error(err?.message || 'Failed to archive staff');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveToTrash = async () => {
    if (hasHistory && confirmName.trim().toLowerCase() !== staff.name.trim().toLowerCase()) {
      error(`Please type "${staff.name}" exactly to confirm moving to trash.`);
      return;
    }

    setIsLoading(true);
    try {
      await staffRepo.softDelete(staff.id);
      showToast(`Moved "${staff.name}" to Trash.`, 'info', {
        label: 'Undo',
        onClick: async () => {
          await staffRepo.restore(staff.id);
          success(`Restored "${staff.name}"`);
          onCompleted();
        },
      });
      onCompleted();
      onClose();
    } catch (err: any) {
      error(err?.message || 'Failed to move to trash');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      title={
        <div className="flex items-center gap-2 text-[var(--expense)]">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Remove Staff Member: {staff.name}</span>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        {mode === 'choose' ? (
          <>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              What would you like to do with <strong>{staff.name}</strong>?
            </p>

            <div className="space-y-2.5">
              {/* Option 1: Archive (Recommended) */}
              <button
                type="button"
                onClick={handleArchive}
                disabled={isLoading}
                className="w-full flex items-start gap-3 p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] transition text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-[var(--surface)] text-[var(--accent)] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition">
                    Archive (Recommended)
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                    Hides the worker from daily attendance lists while preserving all past wages, work logs, and statements.
                  </p>
                </div>
              </button>

              {/* Option 2: Move to Trash */}
              <button
                type="button"
                onClick={() => setMode('trash')}
                disabled={isLoading}
                className="w-full flex items-start gap-3 p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] transition text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-[var(--expense)]/10 text-[var(--expense)] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--expense)]">
                    Move to Trash (Recycle Bin)
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                    Moves staff profile to Trash. Records can be restored from the Trash screen.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          /* Confirmation to move to trash */
          <div className="space-y-3.5">
            {requireOwnerApproval && hasHistory ? (
              <div className="p-3.5 rounded-xl bg-[var(--warning)]/15 border border-[var(--warning)]/30 text-xs text-[var(--text)] space-y-1.5">
                <div className="font-semibold text-[var(--warning)] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Owner Approval Required</span>
                </div>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Your business settings require the business Owner's approval to delete staff members with attendance or payment history. As a manager, please use <strong>Archive</strong> instead, or ask the owner to perform this deletion.
                </p>
              </div>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-[var(--expense)]/10 border border-[var(--expense)]/20 text-xs text-[var(--text)]">
                  This will move <strong>{staff.name}</strong> to the Recycle Bin.
                  {hasHistory && ' Because this employee has attendance or payment history, please type their name below to confirm.'}
                </div>

                {hasHistory && (
                  <FormField label={`Type "${staff.name}" to confirm`}>
                    <Input
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      placeholder={staff.name}
                    />
                  </FormField>
                )}
              </>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMode('choose')}>
                Back
              </Button>
              {!(requireOwnerApproval && hasHistory) && (
                <Button
                  variant="expense"
                  size="sm"
                  isLoading={isLoading}
                  onClick={handleMoveToTrash}
                  disabled={hasHistory && confirmName.trim().toLowerCase() !== staff.name.trim().toLowerCase()}
                >
                  Move to Trash
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
