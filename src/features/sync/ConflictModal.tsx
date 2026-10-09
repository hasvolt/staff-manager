import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { localDb, ConflictItem } from '@/lib/db/dexie';
import { useOrg } from '@/features/org/orgContext';
import { AlertCircle, CheckCircle2, RefreshCw, GitMerge, ShieldCheck, ArrowRight } from 'lucide-react';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({ isOpen, onClose }) => {
  const { currentOrg } = useOrg();
  const { success, error } = useToast();
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(null);
  const [mergedState, setMergedState] = useState<Record<string, any>>({});

  const loadConflicts = async () => {
    if (!currentOrg?.id) return;
    const items = await localDb.conflicts
      .where('org_id')
      .equals(currentOrg.id)
      .filter((c) => c.status === 'pending')
      .toArray();
    setConflicts(items);
    if (items.length > 0 && !selectedConflict) {
      setSelectedConflict(items[0]);
      setMergedState({ ...items[0].client_data });
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConflicts();
    }
  }, [isOpen, currentOrg]);

  useEffect(() => {
    if (selectedConflict) {
      setMergedState({ ...selectedConflict.client_data });
    }
  }, [selectedConflict]);

  const handleResolveKeepMine = async (conflict: ConflictItem) => {
    try {
      const table = (localDb as any)[conflict.table_name];
      if (table) {
        await table.put({
          ...conflict.client_data,
          revision: (conflict.server_data.revision || 1) + 1,
          syncStatus: 'pending',
          updated_at: new Date().toISOString(),
        });
      }
      await localDb.conflicts.update(conflict.id, { status: 'resolved' });

      // Audit log resolution
      await localDb.audit_log.add({
        org_id: conflict.org_id,
        entity_type: conflict.table_name,
        entity_id: conflict.record_id,
        action: 'conflict_resolved_keep_mine',
        created_at: new Date().toISOString(),
      });

      success('Resolved: Kept your local changes.');
      const remaining = conflicts.filter((c) => c.id !== conflict.id);
      setConflicts(remaining);
      setSelectedConflict(remaining[0] || null);
    } catch (e: any) {
      error(e.message || 'Failed to resolve conflict');
    }
  };

  const handleResolveKeepTheirs = async (conflict: ConflictItem) => {
    try {
      const table = (localDb as any)[conflict.table_name];
      if (table) {
        await table.put({
          ...conflict.server_data,
          syncStatus: 'synced',
        });
      }
      await localDb.conflicts.update(conflict.id, { status: 'resolved' });

      await localDb.audit_log.add({
        org_id: conflict.org_id,
        entity_type: conflict.table_name,
        entity_id: conflict.record_id,
        action: 'conflict_resolved_keep_theirs',
        created_at: new Date().toISOString(),
      });

      success('Resolved: Applied remote cloud version.');
      const remaining = conflicts.filter((c) => c.id !== conflict.id);
      setConflicts(remaining);
      setSelectedConflict(remaining[0] || null);
    } catch (e: any) {
      error(e.message || 'Failed to resolve conflict');
    }
  };

  const handleResolveMerge = async (conflict: ConflictItem) => {
    try {
      const table = (localDb as any)[conflict.table_name];
      if (table) {
        await table.put({
          ...mergedState,
          revision: (conflict.server_data.revision || 1) + 1,
          syncStatus: 'pending',
          updated_at: new Date().toISOString(),
        });
      }
      await localDb.conflicts.update(conflict.id, { status: 'resolved' });

      await localDb.audit_log.add({
        org_id: conflict.org_id,
        entity_type: conflict.table_name,
        entity_id: conflict.record_id,
        action: 'conflict_resolved_merge',
        created_at: new Date().toISOString(),
      });

      success('Resolved: Merged attributes saved.');
      const remaining = conflicts.filter((c) => c.id !== conflict.id);
      setConflicts(remaining);
      setSelectedConflict(remaining[0] || null);
    } catch (e: any) {
      error(e.message || 'Failed to merge conflict');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sync Conflict Resolution" maxWidth="lg">
      <div className="space-y-4">
        {conflicts.length === 0 ? (
          <div className="p-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="font-semibold text-sm text-[var(--text)]">No Pending Conflicts</h4>
            <p className="text-xs text-[var(--text-muted)]">
              All records are in sync. When another device edits the exact same record, you can review changes side by side here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Conflict Selector Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 border-b border-[var(--border)]">
              {conflicts.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedConflict(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                    selectedConflict?.id === c.id
                      ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                      : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="capitalize">{c.table_name} #{i + 1}</span>
                </button>
              ))}
            </div>

            {selectedConflict && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-[var(--text-muted)]">
                    Conflict detected on table <strong className="text-[var(--text)]">{selectedConflict.table_name}</strong>
                  </div>
                  <Badge variant="warning" size="sm">Requires Decision</Badge>
                </div>

                {/* Side-by-Side Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Local version */}
                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
                      <span className="text-xs font-bold text-[var(--text)]">Your Local Device</span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        Rev: {selectedConflict.client_data?.revision || 1}
                      </span>
                    </div>
                    <pre className="text-[11px] font-mono text-[var(--text)] p-2 rounded bg-[var(--surface)] max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedConflict.client_data, null, 2)}
                    </pre>
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => handleResolveKeepMine(selectedConflict)}
                    >
                      Keep My Changes
                    </Button>
                  </div>

                  {/* Remote cloud version */}
                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
                      <span className="text-xs font-bold text-[var(--text)]">Remote Cloud Version</span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        Rev: {selectedConflict.server_data?.revision || 1}
                      </span>
                    </div>
                    <pre className="text-[11px] font-mono text-[var(--text)] p-2 rounded bg-[var(--surface)] max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedConflict.server_data, null, 2)}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleResolveKeepTheirs(selectedConflict)}
                    >
                      Accept Remote Changes
                    </Button>
                  </div>
                </div>

                {/* Field-by-field merge option */}
                <div className="pt-2 border-t border-[var(--border)] flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolveMerge(selectedConflict)}
                  >
                    <GitMerge className="w-3.5 h-3.5 mr-1" />
                    Merge & Save
                  </Button>
                </div>
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
