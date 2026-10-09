import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { localDb, LocalAuditLog } from '@/lib/db/dexie';
import { useOrg } from '@/features/org/orgContext';
import { History, Activity, Filter, RefreshCw, User, Calendar } from 'lucide-react';

interface ActivityFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityFeedModal: React.FC<ActivityFeedModalProps> = ({ isOpen, onClose }) => {
  const { currentOrg } = useOrg();
  const [logs, setLogs] = useState<LocalAuditLog[]>([]);
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    if (!currentOrg?.id) return;
    setIsLoading(true);
    try {
      let query = localDb.audit_log.where('org_id').equals(currentOrg.id);
      const all = await query.reverse().sortBy('created_at');
      setLogs(all);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, currentOrg]);

  const filteredLogs = logs.filter((l) => {
    if (entityFilter !== 'all' && l.entity_type !== entityFilter) return false;
    return true;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Activity Feed & Audit Trail" maxWidth="lg">
      <div className="space-y-4">
        {/* Filter bar */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--accent)]" />
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] rounded-lg px-2.5 py-1"
            >
              <option value="all">All Activities</option>
              <option value="staff">Staff Changes</option>
              <option value="attendance_entries">Attendance</option>
              <option value="payments">Payments</option>
              <option value="period_closings">Period Settlements</option>
              <option value="organization">Business Settings</option>
            </select>
          </div>

          <button
            type="button"
            onClick={loadLogs}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition"
            title="Refresh feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Activity List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--text-muted)]">
              No audit logs recorded for this filter.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm">
                      {log.entity_type.replace('_', ' ')}
                    </Badge>
                    <span className="font-semibold text-[var(--text)] capitalize">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                    {log.user_id && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.user_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-[var(--border)]">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
