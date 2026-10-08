import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchBox } from '@/components/ui/SearchBox';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { localDb } from '@/lib/db/dexie';
import {
  staffRepo,
  attendanceRepo,
  workRepo,
  siteRepo,
  workTypeRepo,
  customFieldRepo,
  paymentRepo,
} from '@/lib/db/repository';
import { useOrg } from '@/features/org/orgContext';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/lib/i18n/i18nContext';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Users,
  CalendarCheck,
  Briefcase,
  MapPin,
  Layers,
  Sliders,
  Filter,
  Clock,
  ShieldAlert,
  CreditCard,
} from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface TrashItem {
  id: string;
  type: 'staff' | 'attendance' | 'work' | 'site' | 'work_type' | 'custom_field' | 'payment';
  title: string;
  subtitle: string;
  deletedAt: string;
  raw: any;
}

export const TrashPage: React.FC = () => {
  const { currentOrg, role } = useOrg();
  const { success, error } = useToast();
  const { formatDate } = useI18n();

  const [items, setItems] = useState<TrashItem[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [autoPurgeDays, setAutoPurgeDays] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // Permanent delete modal state
  const [itemToPurge, setItemToPurge] = useState<TrashItem | null>(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false);
  const [emptyTrashConfirmText, setEmptyTrashConfirmText] = useState('');

  // Load auto-purge setting
  useEffect(() => {
    localDb.app_settings.get('trash_auto_purge_days').then((setting) => {
      if (setting && typeof setting.value === 'number') {
        setAutoPurgeDays(setting.value);
      }
    });
  }, []);

  const handleUpdateAutoPurge = async (days: number) => {
    setAutoPurgeDays(days);
    await localDb.app_settings.put({
      key: 'trash_auto_purge_days',
      value: days,
    });
    success(`Auto-purge setting updated: ${days === 0 ? 'Never (Keep forever)' : `After ${days} days`}`);
    loadTrash();
  };

  const loadTrash = async () => {
    if (!currentOrg?.id) return;
    setIsLoading(true);

    const trashList: TrashItem[] = [];

    // Read purge setting
    const purgeSetting = await localDb.app_settings.get('trash_auto_purge_days');
    const purgeDays = purgeSetting?.value ?? 0;
    const purgeCutoff =
      purgeDays > 0 ? new Date(Date.now() - purgeDays * 24 * 60 * 60 * 1000).toISOString() : null;

    // 1. Staff
    const deletedStaff = await localDb.staff
      .where('org_id')
      .equals(currentOrg.id)
      .filter((s) => !!s.deleted_at)
      .toArray();
    for (const s of deletedStaff) {
      if (purgeCutoff && s.deleted_at! < purgeCutoff) {
        await localDb.staff.delete(s.id);
        continue;
      }
      trashList.push({
        id: s.id,
        type: 'staff',
        title: s.name,
        subtitle: `${s.role_title || 'Worker'} • ${s.payment_type} wage`,
        deletedAt: s.deleted_at!,
        raw: s,
      });
    }

    // 2. Attendance
    const deletedAttendance = await localDb.attendance_entries
      .where('org_id')
      .equals(currentOrg.id)
      .filter((a) => !!a.deleted_at)
      .toArray();
    for (const a of deletedAttendance) {
      if (purgeCutoff && a.deleted_at! < purgeCutoff) {
        await localDb.attendance_entries.delete(a.id);
        continue;
      }
      const staffMember = await localDb.staff.get(a.staff_id);
      trashList.push({
        id: a.id,
        type: 'attendance',
        title: `Attendance: ${staffMember?.name || 'Staff'}`,
        subtitle: `Date: ${a.work_date} • Status: ${a.status.toUpperCase()}`,
        deletedAt: a.deleted_at!,
        raw: a,
      });
    }

    // 3. Work entries
    const deletedWork = await localDb.work_entries
      .where('org_id')
      .equals(currentOrg.id)
      .filter((w) => !!w.deleted_at)
      .toArray();
    for (const w of deletedWork) {
      if (purgeCutoff && w.deleted_at! < purgeCutoff) {
        await localDb.work_entries.delete(w.id);
        continue;
      }
      const staffMember = await localDb.staff.get(w.staff_id);
      trashList.push({
        id: w.id,
        type: 'work',
        title: `Work: ${w.description || 'Daily Task'}`,
        subtitle: `${staffMember?.name || 'Staff'} • ${w.work_date}`,
        deletedAt: w.deleted_at!,
        raw: w,
      });
    }

    // 4. Sites
    const deletedSites = await localDb.sites
      .where('org_id')
      .equals(currentOrg.id)
      .filter((s) => !!s.deleted_at)
      .toArray();
    for (const s of deletedSites) {
      if (purgeCutoff && s.deleted_at! < purgeCutoff) {
        await localDb.sites.delete(s.id);
        continue;
      }
      trashList.push({
        id: s.id,
        type: 'site',
        title: `Site: ${s.name}`,
        subtitle: s.address || 'Project Location',
        deletedAt: s.deleted_at!,
        raw: s,
      });
    }

    // 5. Work Types
    const deletedWorkTypes = await localDb.work_types
      .where('org_id')
      .equals(currentOrg.id)
      .filter((wt) => !!wt.deleted_at)
      .toArray();
    for (const wt of deletedWorkTypes) {
      if (purgeCutoff && wt.deleted_at! < purgeCutoff) {
        await localDb.work_types.delete(wt.id);
        continue;
      }
      trashList.push({
        id: wt.id,
        type: 'work_type',
        title: `Work Type: ${wt.name}`,
        subtitle: `Unit: ${wt.unit_name || 'piece'}`,
        deletedAt: wt.deleted_at!,
        raw: wt,
      });
    }

    // 6. Custom Field Definitions
    const deletedFields = await localDb.custom_field_defs
      .where('org_id')
      .equals(currentOrg.id)
      .filter((cf) => !!cf.deleted_at)
      .toArray();
    for (const cf of deletedFields) {
      if (purgeCutoff && cf.deleted_at! < purgeCutoff) {
        await localDb.custom_field_defs.delete(cf.id);
        continue;
      }
      trashList.push({
        id: cf.id,
        type: 'custom_field',
        title: `Field: ${cf.label}`,
        subtitle: `Type: ${cf.field_type} (${cf.entity})`,
        deletedAt: cf.deleted_at!,
        raw: cf,
      });
    }

    // 7. Payments
    const deletedPayments = await localDb.payments
      .where('org_id')
      .equals(currentOrg.id)
      .filter((p) => !!p.deleted_at)
      .toArray();
    for (const p of deletedPayments) {
      if (purgeCutoff && p.deleted_at! < purgeCutoff) {
        await localDb.payments.delete(p.id);
        continue;
      }
      const staffMember = await localDb.staff.get(p.staff_id);
      trashList.push({
        id: p.id,
        type: 'payment',
        title: `Payment: ${p.type.toUpperCase()} (₹${p.amount})`,
        subtitle: `${staffMember?.name || 'Staff'} • ${p.pay_date} • Mode: ${p.mode || 'cash'}`,
        deletedAt: p.deleted_at!,
        raw: p,
      });
    }

    trashList.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
    setItems(trashList);
    setIsLoading(false);
  };

  useEffect(() => {
    loadTrash();
  }, [currentOrg]);

  const handleRestore = async (item: TrashItem) => {
    try {
      if (item.type === 'staff') await staffRepo.restore(item.id);
      else if (item.type === 'attendance') await attendanceRepo.restore(item.id);
      else if (item.type === 'work') await workRepo.restore(item.id);
      else if (item.type === 'site') await siteRepo.restore(item.id);
      else if (item.type === 'work_type') await workTypeRepo.restore(item.id);
      else if (item.type === 'custom_field') await customFieldRepo.restore(item.id);
      else if (item.type === 'payment') await paymentRepo.restore(item.id);

      success(`Restored "${item.title}" successfully`);
      loadTrash();
    } catch {
      error('Failed to restore record');
    }
  };

  const handlePermanentDelete = async (item: TrashItem) => {
    try {
      if (item.type === 'staff') await localDb.staff.delete(item.id);
      else if (item.type === 'attendance') await localDb.attendance_entries.delete(item.id);
      else if (item.type === 'work') await localDb.work_entries.delete(item.id);
      else if (item.type === 'site') await localDb.sites.delete(item.id);
      else if (item.type === 'work_type') await localDb.work_types.delete(item.id);
      else if (item.type === 'custom_field') await localDb.custom_field_defs.delete(item.id);
      else if (item.type === 'payment') await localDb.payments.delete(item.id);

      success(`Permanently deleted "${item.title}"`);
      setItemToPurge(null);
      setPurgeConfirmText('');
      loadTrash();
    } catch {
      error('Failed to permanently delete');
    }
  };

  const handleEmptyTrash = async () => {
    try {
      for (const item of items) {
        if (item.type === 'staff') await localDb.staff.delete(item.id);
        else if (item.type === 'attendance') await localDb.attendance_entries.delete(item.id);
        else if (item.type === 'work') await localDb.work_entries.delete(item.id);
        else if (item.type === 'site') await localDb.sites.delete(item.id);
        else if (item.type === 'work_type') await localDb.work_types.delete(item.id);
        else if (item.type === 'custom_field') await localDb.custom_field_defs.delete(item.id);
        else if (item.type === 'payment') await localDb.payments.delete(item.id);
      }
      success('Recycle Bin emptied.');
      setShowEmptyTrashConfirm(false);
      setEmptyTrashConfirmText('');
      loadTrash();
    } catch {
      error('Failed to empty trash');
    }
  };

  const filteredItems = items.filter((i) => {
    if (filterType !== 'all' && i.type !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return i.title.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q);
    }
    return true;
  });

  const isOwner = role === 'owner';

  return (
    <div className="space-y-4 animate-in fade-in text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">Trash (Recycle Bin)</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Safely restore deleted staff, daily entries, sites, and records
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto-Purge Policy Setting */}
          <div className="flex items-center gap-1.5 text-xs bg-[var(--surface-2)] px-2.5 py-1 rounded-xl border border-[var(--border)]">
            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">Auto-purge:</span>
            <select
              value={autoPurgeDays}
              onChange={(e) => handleUpdateAutoPurge(Number(e.target.value))}
              disabled={!isOwner}
              className="bg-transparent text-[var(--text)] font-semibold cursor-pointer outline-none"
            >
              <option value={0} className="bg-[var(--surface)] text-[var(--text)]">Never (Keep Forever)</option>
              <option value={30} className="bg-[var(--surface)] text-[var(--text)]">After 30 Days</option>
              <option value={60} className="bg-[var(--surface)] text-[var(--text)]">After 60 Days</option>
              <option value={90} className="bg-[var(--surface)] text-[var(--text)]">After 90 Days</option>
            </select>
          </div>

          {items.length > 0 && isOwner && (
            <Button
              variant="expense"
              size="sm"
              onClick={() => setShowEmptyTrashConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
              <span>Empty Trash</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search deleted records..."
        />

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
          {['all', 'staff', 'attendance', 'work', 'site', 'work_type', 'custom_field', 'payment'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer capitalize ${
                filterType === type
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {type === 'work_type' ? 'Work Types' : type === 'custom_field' ? 'Fields' : type === 'payment' ? 'Payments' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Trash Item List */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<Trash2 className="w-6 h-6" />}
          title="Recycle Bin is empty"
          description="Deleted staff, attendance entries, sites, or fields will appear here with instant restore options."
        />
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] flex items-center justify-center shrink-0 text-[var(--text-muted)]">
                  {item.type === 'staff' && <Users className="w-4 h-4 text-[var(--accent)]" />}
                  {item.type === 'attendance' && <CalendarCheck className="w-4 h-4 text-[var(--income)]" />}
                  {item.type === 'work' && <Briefcase className="w-4 h-4 text-purple-400" />}
                  {item.type === 'site' && <MapPin className="w-4 h-4 text-blue-400" />}
                  {item.type === 'work_type' && <Layers className="w-4 h-4 text-amber-400" />}
                  {item.type === 'custom_field' && <Sliders className="w-4 h-4 text-rose-400" />}
                  {item.type === 'payment' && <CreditCard className="w-4 h-4 text-emerald-400" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--text)] truncate">{item.title}</span>
                    <Badge variant="neutral" size="sm">
                      {item.type === 'work_type' ? 'work type' : item.type === 'custom_field' ? 'field' : item.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate">{item.subtitle}</p>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Deleted {formatDate(item.deletedAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRestore(item)}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[var(--income)]" />
                  <span>Restore</span>
                </Button>

                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--expense)] hover:bg-[var(--expense)]/10"
                    onClick={() => {
                      setPurgeConfirmText('');
                      setItemToPurge(item);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Strong Confirmation Permanent Delete Modal */}
      {itemToPurge && (
        <Modal
          isOpen={!!itemToPurge}
          onClose={() => {
            setItemToPurge(null);
            setPurgeConfirmText('');
          }}
          maxWidth="sm"
          title={
            <div className="flex items-center gap-2 text-[var(--expense)]">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>Permanent Delete Record</span>
            </div>
          }
        >
          <div className="space-y-4 text-left">
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Are you sure you want to permanently delete <strong>"{itemToPurge.title}"</strong>?
              This record cannot be recovered once purged.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text)]">
                Type <strong className="text-[var(--expense)]">DELETE</strong> to confirm:
              </label>
              <Input
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setItemToPurge(null);
                  setPurgeConfirmText('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="expense"
                size="sm"
                disabled={purgeConfirmText.trim() !== 'DELETE'}
                onClick={() => handlePermanentDelete(itemToPurge)}
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Strong Confirmation Empty Trash Modal */}
      {showEmptyTrashConfirm && (
        <Modal
          isOpen={showEmptyTrashConfirm}
          onClose={() => {
            setShowEmptyTrashConfirm(false);
            setEmptyTrashConfirmText('');
          }}
          maxWidth="sm"
          title={
            <div className="flex items-center gap-2 text-[var(--expense)]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Empty Entire Recycle Bin</span>
            </div>
          }
        >
          <div className="space-y-4 text-left">
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              This will permanently delete all {items.length} records currently in the trash.
              This operation cannot be reversed.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text)]">
                Type <strong className="text-[var(--expense)]">EMPTY</strong> to confirm:
              </label>
              <Input
                value={emptyTrashConfirmText}
                onChange={(e) => setEmptyTrashConfirmText(e.target.value)}
                placeholder="EMPTY"
              />
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowEmptyTrashConfirm(false);
                  setEmptyTrashConfirmText('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="expense"
                size="sm"
                disabled={emptyTrashConfirmText.trim() !== 'EMPTY'}
                onClick={handleEmptyTrash}
              >
                Empty Entire Trash
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
