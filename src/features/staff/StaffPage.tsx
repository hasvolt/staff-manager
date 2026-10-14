import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { SearchBox } from '@/components/ui/SearchBox';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { VirtualList } from '@/components/ui/VirtualList';
import { StaffFormModal } from './StaffFormModal';
import { StaffDetailModal } from './StaffDetailModal';
import { StaffDeleteDialog } from './StaffDeleteDialog';
import { CustomFieldsModal } from './CustomFieldsModal';
import { ImportStaffModal } from './ImportStaffModal';
import { StaffHistoryModal } from '@/features/history/StaffHistoryModal';
import { SalarySlipModal } from '@/features/reports/SalarySlipModal';
import { staffRepo, staffCompensationRepo, siteRepo } from '@/lib/db/repository';
import { localDb, LocalStaff, LocalSite } from '@/lib/db/dexie';
import { useOrg } from '@/features/org/orgContext';
import { useOrgLabels } from '@/lib/org/labels';
import { canUserPerformAction } from '@/lib/permissions/rbac';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useToast } from '@/components/ui/Toast';
import {
  Users,
  UserPlus,
  Filter,
  ArrowUpDown,
  Phone,
  CheckSquare,
  Square,
  Archive,
  ChevronRight,
  Sliders,
  MapPin,
  List,
  LayoutGrid,
} from 'lucide-react';

export const StaffPage: React.FC = () => {
  const { currentOrg, role } = useOrg();
  const { siteLabel } = useOrgLabels();
  const { t, formatCurrency } = useI18n();
  const { showToast, success, error } = useToast();

  const [staffList, setStaffList] = useState<LocalStaff[]>([]);
  const [sites, setSites] = useState<LocalSite[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'joining_date' | 'rate'>('name');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<LocalStaff | null>(null);
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<LocalStaff | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<LocalStaff | null>(null);
  const [staffHasHistory, setStaffHasHistory] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [historyStaff, setHistoryStaff] = useState<LocalStaff | null>(null);
  const [salarySlipStaffId, setSalarySlipStaffId] = useState<string | null>(null);

  // Bulk selection mode
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const canViewMoney = canUserPerformAction(role as any, 'view_payments');

  const loadData = async () => {
    if (!currentOrg?.id) return;
    const staff = await staffRepo.list(currentOrg.id, false);

    if (canViewMoney) {
      const comps = await staffCompensationRepo.list(currentOrg.id, false);
      const compMap = new Map(comps.map((c) => [c.staff_id, c]));
      staff.forEach((s) => {
        const c = compMap.get(s.id);
        if (c) {
          s.compensation = c;
          s.rate = c.rate;
          s.overtime_rate = c.overtime_rate;
          s.payment_note = c.payment_note;
          s.rate_history = c.rate_history;
        }
      });
    } else {
      // Supervisor or restricted viewer: wipe rate from in-memory objects
      staff.forEach((s) => {
        delete s.rate;
        delete s.overtime_rate;
        delete s.payment_note;
        delete s.rate_history;
        delete s.compensation;
      });
    }

    setStaffList(staff);
    const loadedSites = await siteRepo.list(currentOrg.id, false);
    setSites(loadedSites);
  };

  useEffect(() => {
    loadData();
  }, [currentOrg]);

  // Extract distinct roles
  const distinctRoles = useMemo(() => {
    const roles = new Set<string>();
    staffList.forEach((s) => {
      if (s.role_title) roles.add(s.role_title);
    });
    return Array.from(roles);
  }, [staffList]);

  // Filtered and sorted staff
  const filteredStaff = useMemo(() => {
    return staffList
      .filter((s) => {
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        if (roleFilter !== 'all' && s.role_title !== roleFilter) return false;
        if (siteFilter !== 'all' && s.default_site_id !== siteFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = s.name.toLowerCase().includes(q);
          const matchCode = (s.staff_code || '').toLowerCase().includes(q);
          const matchPhone = (s.phone || '').includes(q);
          const matchRole = (s.role_title || '').toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchPhone && !matchRole) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'rate') return (b.rate ?? 0) - (a.rate ?? 0);
        if (sortBy === 'joining_date') {
          return (b.joining_date || '').localeCompare(a.joining_date || '');
        }
        return 0;
      });
  }, [staffList, search, statusFilter, roleFilter, siteFilter, sortBy]);

  const handleOpenDelete = async (staff: LocalStaff) => {
    // Check if staff has attendance or payments
    const attCount = await localDb.attendance_entries.where('staff_id').equals(staff.id).count();
    const payCount = await localDb.payments.where('staff_id').equals(staff.id).count();
    setStaffHasHistory(attCount > 0 || payCount > 0);
    setStaffToDelete(staff);
  };

  const handleDuplicate = async (staff: LocalStaff) => {
    if (!currentOrg) return;
    try {
      await staffRepo.create({
        org_id: currentOrg.id,
        name: `${staff.name} (Copy)`,
        role_title: staff.role_title,
        payment_type: staff.payment_type,
        rate: staff.rate,
        overtime_rate: staff.overtime_rate,
        hours_per_day: staff.hours_per_day,
        weekly_off: staff.weekly_off,
        status: 'active',
        rate_history: staff.rate_history,
        unit_name: staff.unit_name,
        custom: {},
      });
      success(`Duplicated staff profile for "${staff.name}"`);
      loadData();
    } catch {
      error('Failed to duplicate staff');
    }
  };

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStaff.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStaff.map((s) => s.id)));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    try {
      const idsToArchive = Array.from(selectedIds);
      for (const id of idsToArchive) {
        await staffRepo.update(id, { status: 'inactive' });
      }
      showToast(`Archived ${idsToArchive.length} staff members`, 'info', {
        label: 'Undo',
        onClick: async () => {
          for (const id of idsToArchive) {
            await staffRepo.update(id, { status: 'active' });
          }
          success(`Restored active status for ${idsToArchive.length} staff members`);
          loadData();
        },
      });
      setSelectedIds(new Set());
      loadData();
    } catch {
      error('Failed to bulk archive staff');
    }
  };

  const handleBulkAssignSite = async (siteId: string) => {
    if (selectedIds.size === 0 || !siteId) return;
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await staffRepo.update(id, { default_site_id: siteId });
      }
      const siteObj = sites.find((s) => s.id === siteId);
      success(`Assigned ${ids.length} staff to site "${siteObj?.name || 'Selected'}"`);
      setSelectedIds(new Set());
      loadData();
    } catch {
      error('Failed to assign site to selected staff');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in text-left">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface-2)]/40 p-3.5 sm:p-4 rounded-2xl border border-[var(--border)] shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] flex items-center gap-2">
            <span>{t('staff.title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 font-medium">
            Total {staffList.length} staff enrolled &bull; {filteredStaff.length} matching filter
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[var(--surface)] text-[var(--accent)] shadow-2xs font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[var(--surface)] text-[var(--accent)] shadow-2xs font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
              title="Virtualized List View (Fast for 1000+ staff)"
              aria-label="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportOpen(true)}
            title="Import staff from CSV spreadsheet"
          >
            <span>Import CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomFieldsOpen(true)}
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Custom Fields</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setStaffToEdit(null);
              setIsFormOpen(true);
            }}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by name, phone, designation, or staff ID..."
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status filter */}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-auto py-1 text-xs"
            options={[
              { value: 'active', label: 'Active Only' },
              { value: 'inactive', label: 'Archived / Inactive' },
              { value: 'left', label: 'Left Work' },
              { value: 'all', label: 'All Statuses' },
            ]}
          />

          {/* Role filter */}
          {distinctRoles.length > 0 && (
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-auto py-1 text-xs"
              options={[
                { value: 'all', label: 'All Roles' },
                ...distinctRoles.map((r) => ({ value: r, label: r })),
              ]}
            />
          )}

          {/* Site filter */}
          {sites.length > 0 && (
            <Select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="w-auto py-1 text-xs"
              options={[
                { value: 'all', label: `All ${siteLabel}s` },
                ...sites.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          )}

          {/* Sort By */}
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-auto py-1 text-xs ml-auto"
            options={[
              { value: 'name', label: 'Sort: Name' },
              { value: 'rate', label: 'Sort: Highest Rate' },
              { value: 'joining_date', label: 'Sort: Joining Date' },
            ]}
          />
        </div>
      </div>

      {/* Bulk Action Toolbar (if selected) */}
      {selectedIds.size > 0 && (
        <div className="p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in">
          <span className="font-semibold text-[var(--accent)]">
            {selectedIds.size} staff member{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Assign Site */}
            {sites.length > 0 && (
              <Select
                value=""
                onChange={(e) => {
                  if (e.target.value) handleBulkAssignSite(e.target.value);
                }}
                className="w-auto py-1 text-xs"
                options={[
                  { value: '', label: `Assign to ${siteLabel}...` },
                  ...sites.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            )}

            <Button variant="outline" size="sm" onClick={handleBulkArchive}>
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Staff List */}
      {filteredStaff.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title={search ? 'No matching staff members' : 'No staff added yet'}
          description={
            search
              ? 'Try modifying your search or filter options.'
              : 'Add your mistris, helpers, drivers, or workers to track attendance and settlements.'
          }
          action={
            !search ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setStaffToEdit(null);
                  setIsFormOpen(true);
                }}
              >
                <UserPlus className="w-4 h-4" />
                <span>Add First Staff Member</span>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {/* Select all toggle */}
          <div className="flex items-center justify-between px-2 text-xs text-[var(--text-muted)] select-none">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 hover:text-[var(--text)] transition cursor-pointer"
            >
              {selectedIds.size === filteredStaff.length ? (
                <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>Select All</span>
            </button>
            <span>Showing {filteredStaff.length}</span>
          </div>

          {viewMode === 'list' ? (
            <VirtualList
              items={filteredStaff}
              height={550}
              itemHeight={76}
              renderItem={(staff) => {
                const isSelected = selectedIds.has(staff.id);
                return (
                  <div
                    key={staff.id}
                    onClick={() => setSelectedStaffDetail(staff)}
                    className={`mx-1 my-1 p-2.5 rounded-xl border transition text-left cursor-pointer flex items-center justify-between gap-3 shadow-2xs group ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--surface-2)] ring-1 ring-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => toggleSelectOne(staff.id, e)}
                        className="text-[var(--text-muted)] hover:text-[var(--accent)] p-0.5 shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <Avatar name={staff.name} src={staff.photo_path || undefined} size="sm" />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs text-[var(--text)] truncate">
                            {staff.name}
                          </span>
                          {staff.status !== 'active' && (
                            <Badge variant="neutral" size="sm">
                              {staff.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          {staff.role_title || 'Staff'} {staff.staff_code && `• ${staff.staff_code}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canViewMoney && staff.rate !== undefined && (
                        <span className="text-xs font-bold text-[var(--accent)]">
                          {formatCurrency(staff.rate)}
                          <span className="text-[10px] text-[var(--text-muted)] font-normal ml-0.5">
                            /{staff.payment_type[0]}
                          </span>
                        </span>
                      )}
                      {staff.phone && (
                        <a
                          href={`tel:${staff.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--income)] hover:bg-[var(--surface-2)] transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    </div>
                  </div>
                );
              }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredStaff.map((staff) => {
                const isSelected = selectedIds.has(staff.id);
                return (
                  <div
                    key={staff.id}
                    onClick={() => setSelectedStaffDetail(staff)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs group select-none active:scale-[0.99] ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--surface-2)] ring-1 ring-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]/60 hover:border-[var(--accent)]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => toggleSelectOne(staff.id, e)}
                        className="text-[var(--text-muted)] hover:text-[var(--accent)] p-0.5 shrink-0 cursor-pointer"
                        aria-label={`Select ${staff.name}`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <Avatar name={staff.name} src={staff.photo_path || undefined} size="md" />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-[var(--text)] truncate">
                            {staff.name}
                          </span>
                          {staff.status !== 'active' && (
                            <Badge variant="neutral" size="sm">
                              {staff.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5 font-medium">
                          {staff.role_title || 'Worker'} {staff.staff_code && `• ${staff.staff_code}`}
                        </p>
                        {canViewMoney && staff.rate !== undefined && (
                          <p className="text-xs font-bold text-[var(--income)] mt-0.5">
                            {formatCurrency(staff.rate)}{' '}
                            <span className="text-[10px] text-[var(--text-muted)] font-normal">
                              / {staff.payment_type}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {staff.phone && (
                        <a
                          href={`tel:${staff.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-[var(--income)] hover:bg-emerald-500/25 flex items-center justify-center transition active:scale-90 shadow-2xs"
                          title={`Call ${staff.name}`}
                          aria-label={`Call ${staff.name}`}
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <StaffFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        staffToEdit={staffToEdit}
        onSaved={loadData}
      />

      <CustomFieldsModal
        isOpen={isCustomFieldsOpen}
        onClose={() => setIsCustomFieldsOpen(false)}
        onUpdated={loadData}
      />

      <ImportStaffModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={loadData}
      />

      <StaffDetailModal
        isOpen={!!selectedStaffDetail}
        onClose={() => setSelectedStaffDetail(null)}
        staff={selectedStaffDetail}
        onEdit={(s) => {
          setStaffToEdit(s);
          setIsFormOpen(true);
        }}
        onDuplicate={handleDuplicate}
        onDeleteRequest={handleOpenDelete}
        onViewHistory={(s) => setHistoryStaff(s)}
        onViewSalarySlip={(s) => setSalarySlipStaffId(s.id)}
      />

      <StaffDeleteDialog
        isOpen={!!staffToDelete}
        onClose={() => setStaffToDelete(null)}
        staff={staffToDelete}
        hasHistory={staffHasHistory}
        requireOwnerApproval={Boolean(currentOrg?.settings?.require_owner_delete_approval && role !== 'owner')}
        onCompleted={loadData}
      />

      {historyStaff && (
        <StaffHistoryModal
          isOpen={Boolean(historyStaff)}
          onClose={() => setHistoryStaff(null)}
          staff={historyStaff}
        />
      )}

      {salarySlipStaffId && (
        <SalarySlipModal
          isOpen={Boolean(salarySlipStaffId)}
          onClose={() => setSalarySlipStaffId(null)}
          staffId={salarySlipStaffId}
        />
      )}
    </div>
  );
};
