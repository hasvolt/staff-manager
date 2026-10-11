import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { LocalStaff, LocalCustomFieldDef } from '@/lib/db/dexie';
import { customFieldRepo } from '@/lib/db/repository';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useOrg } from '@/features/org/orgContext';
import { canUserPerformAction } from '@/lib/permissions/rbac';
import {
  Phone,
  Calendar,
  Briefcase,
  DollarSign,
  MapPin,
  Clock,
  History,
  Edit2,
  Trash2,
  Copy,
  Archive,
  RotateCcw,
} from 'lucide-react';

interface StaffDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: LocalStaff | null;
  onEdit: (staff: LocalStaff) => void;
  onDuplicate: (staff: LocalStaff) => void;
  onDeleteRequest: (staff: LocalStaff) => void;
  onViewHistory?: (staff: LocalStaff) => void;
  onViewSalarySlip?: (staff: LocalStaff) => void;
}

export const StaffDetailModal: React.FC<StaffDetailModalProps> = ({
  isOpen,
  onClose,
  staff,
  onEdit,
  onDuplicate,
  onDeleteRequest,
  onViewHistory,
  onViewSalarySlip,
}) => {
  const { t, formatCurrency, formatDate } = useI18n();
  const { role } = useOrg();
  const canViewMoney = canUserPerformAction(role as any, 'view_payments');
  const [customFieldDefs, setCustomFieldDefs] = React.useState<LocalCustomFieldDef[]>([]);

  React.useEffect(() => {
    if (staff && staff.org_id && isOpen) {
      customFieldRepo.list(staff.org_id, false).then((all) => {
        setCustomFieldDefs(all.filter((f) => f.entity === 'staff'));
      });
    }
  }, [staff, isOpen]);

  if (!staff) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2">
          <Avatar name={staff.name} src={staff.photo_path || undefined} size="sm" />
          <span className="truncate">{staff.name}</span>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        {/* Header Summary */}
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)]">
          <Avatar name={staff.name} src={staff.photo_path || undefined} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base text-[var(--text)]">{staff.name}</h3>
              <Badge
                variant={
                  staff.status === 'active'
                    ? 'income'
                    : staff.status === 'inactive'
                    ? 'neutral'
                    : 'expense'
                }
                size="sm"
              >
                {staff.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {staff.role_title || 'General Staff'} &bull; {staff.staff_code || 'No ID'}
            </p>
            {staff.phone && (
              <a
                href={`tel:${staff.phone}`}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] font-semibold mt-1 hover:underline"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{staff.phone}</span>
              </a>
            )}
          </div>
        </div>

        {/* Wage Structure Card */}
        {canViewMoney && (
          <div className="p-4 rounded-2xl bg-[var(--surface-2)]/40 border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Payment Terms
              </span>
              <span className="text-xs font-bold text-[var(--accent)] capitalize">
                {staff.payment_type} Basis
              </span>
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-2xl font-extrabold text-[var(--text)]">
                {formatCurrency(staff.rate ?? 0)}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {staff.payment_type === 'daily'
                  ? '/ day'
                  : staff.payment_type === 'monthly'
                  ? '/ month'
                  : staff.payment_type === 'hourly'
                  ? '/ hour'
                  : `/ ${staff.unit_name || 'piece'}`}
              </span>
            </div>

            {staff.overtime_rate && (
              <p className="text-xs text-[var(--text-muted)]">
                Overtime rate: <strong>{formatCurrency(staff.overtime_rate)}/hr</strong>
              </p>
            )}

            {staff.hours_per_day && (
              <p className="text-xs text-[var(--text-muted)]">
                Standard shift: <strong>{staff.hours_per_day} hours/day</strong>
              </p>
            )}
          </div>
        )}

        {/* Personal & Workplace Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-[var(--surface-2)]/30 border border-[var(--border)]">
            <span className="text-[var(--text-muted)] block">Joining Date</span>
            <span className="font-semibold text-[var(--text)] mt-0.5 block">
              {staff.joining_date ? formatDate(staff.joining_date) : 'Not specified'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-2)]/30 border border-[var(--border)]">
            <span className="text-[var(--text-muted)] block">Alternate Phone</span>
            <span className="font-semibold text-[var(--text)] mt-0.5 block">
              {staff.alt_phone || 'None'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-2)]/30 border border-[var(--border)]">
            <span className="text-[var(--text-muted)] block">Address / Hometown</span>
            <span className="font-semibold text-[var(--text)] mt-0.5 block">
              {staff.address || 'Not specified'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-2)]/30 border border-[var(--border)]">
            <span className="text-[var(--text-muted)] block">Emergency Contact</span>
            <span className="font-semibold text-[var(--text)] mt-0.5 block">
              {staff.emergency_contact || 'None'}
            </span>
          </div>
        </div>

        {/* Custom Attributes */}
        {customFieldDefs.length > 0 && Object.keys(staff.custom || {}).length > 0 && (
          <div className="p-3.5 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border)] space-y-2 text-xs">
            <span className="font-semibold text-[var(--accent)] block uppercase tracking-wider text-[11px]">
              Custom Attributes
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {customFieldDefs.map((def) => {
                const val = staff.custom?.[def.id];
                if (val === undefined || val === null || val === '') return null;
                return (
                  <div key={def.id} className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                    <span className="text-[var(--text-muted)] text-[10px] block">{def.label}</span>
                    <span className="font-semibold text-[var(--text)] mt-0.5 block truncate">
                      {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment / UPI Notes */}
        {canViewMoney && staff.payment_note && (
          <div className="p-3 rounded-xl bg-[var(--surface-2)]/30 border border-[var(--border)] text-xs">
            <span className="text-[var(--text-muted)] block">Payment Note / UPI</span>
            <span className="font-semibold text-[var(--text)] mt-0.5 block">
              {staff.payment_note}
            </span>
          </div>
        )}

        {/* Rate History */}
        {canViewMoney && staff.rate_history && staff.rate_history.length > 1 && (
          <div className="p-3 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border)] space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-[var(--text)] font-semibold">
              <History className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Rate Revision History</span>
            </div>
            <div className="space-y-1 pt-1">
              {staff.rate_history.map((rh, i) => (
                <div key={i} className="flex justify-between text-[11px] text-[var(--text-muted)]">
                  <span>From {formatDate(rh.effective_from || rh.from)}:</span>
                  <span className="font-semibold text-[var(--text)]">
                    {formatCurrency(rh.rate)} ({rh.type})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="expense"
            size="sm"
            onClick={() => {
              onClose();
              onDeleteRequest(staff);
            }}
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove / Trash</span>
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onViewHistory?.(staff);
              }}
            >
              <History className="w-4 h-4" />
              <span>Full History</span>
            </Button>

            {canViewMoney && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onViewSalarySlip?.(staff);
                }}
              >
                <DollarSign className="w-4 h-4" />
                <span>Salary Slip</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onDuplicate(staff);
              }}
            >
              <Copy className="w-4 h-4" />
              <span>Duplicate</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(staff);
              }}
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
