import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useOrg } from '@/features/org/orgContext';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useToast } from '@/components/ui/Toast';
import { localDb, LocalStaff, LocalPayment, LocalAttendanceEntry, LocalWorkEntry } from '@/lib/db/dexie';
import { paymentRepo } from '@/lib/db/repository';
import {
  calculateStaffEarnings,
  calculateStaffNetDues,
  roundMoney,
} from '@/lib/calculations/salaryCalculations';
import {
  CreditCard,
  PlusCircle,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  FileText,
  Clock,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export interface StaffLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: LocalStaff | null;
  onRecordPayment: (staffId: string, prefillAmount?: number) => void;
  onEditPayment: (payment: LocalPayment) => void;
}

export const StaffLedgerModal: React.FC<StaffLedgerModalProps> = ({
  isOpen,
  onClose,
  staff,
  onRecordPayment,
  onEditPayment,
}) => {
  const { currentOrg } = useOrg();
  const { t, formatCurrency, formatDate } = useI18n();
  const { success, error } = useToast();

  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_month' | 'custom'>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [payments, setPayments] = useState<LocalPayment[]>([]);
  const [attendanceEntries, setAttendanceEntries] = useState<LocalAttendanceEntry[]>([]);
  const [workEntries, setWorkEntries] = useState<LocalWorkEntry[]>([]);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Compute active date boundaries
  const dateRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (dateFilter === 'this_month') {
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
      return { start, end };
    }

    if (dateFilter === 'last_month') {
      const start = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const end = new Date(year, month, 0).toISOString().split('T')[0];
      return { start, end };
    }

    if (dateFilter === 'custom' && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }

    // 'all'
    return { start: '2000-01-01', end: '2099-12-31' };
  }, [dateFilter, customStart, customEnd]);

  const loadLedgerData = async () => {
    if (!currentOrg?.id || !staff?.id) return;

    // Load payments
    const pList = await localDb.payments
      .where('org_id')
      .equals(currentOrg.id)
      .filter((p) => !p.deleted_at && p.staff_id === staff.id)
      .toArray();

    // Load attendance
    const aList = await localDb.attendance_entries
      .where('org_id')
      .equals(currentOrg.id)
      .filter((a) => !a.deleted_at && a.staff_id === staff.id)
      .toArray();

    // Load work
    const wList = await localDb.work_entries
      .where('org_id')
      .equals(currentOrg.id)
      .filter((w) => !w.deleted_at && w.staff_id === staff.id)
      .toArray();

    setPayments(pList);
    setAttendanceEntries(aList);
    setWorkEntries(wList);
  };

  useEffect(() => {
    if (isOpen && staff) {
      loadLedgerData();
    }
  }, [isOpen, staff, currentOrg]);

  // Calculations for this staff in selected date range
  const earningsBreakdown = useMemo(() => {
    if (!staff) return null;
    return calculateStaffEarnings({
      staff,
      startDate: dateRange.start,
      endDate: dateRange.end,
      attendanceEntries,
      workEntries,
      monthMode: 'fixed_30',
    });
  }, [staff, dateRange, attendanceEntries, workEntries]);

  // Net dues
  const netDues = useMemo(() => {
    if (!staff || !earningsBreakdown) return null;
    const filteredPayments = payments.filter((p) => p.pay_date >= dateRange.start && p.pay_date <= dateRange.end);
    return calculateStaffNetDues({
      staffId: staff.id,
      totalEarned: earningsBreakdown.totalEarned,
      payments: filteredPayments,
    });
  }, [staff, earningsBreakdown, payments, dateRange]);

  const filteredPaymentsList = useMemo(() => {
    return payments
      .filter((p) => {
        if (p.pay_date < dateRange.start || p.pay_date > dateRange.end) return false;
        if (typeFilter !== 'all' && p.type !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => b.pay_date.localeCompare(a.pay_date));
  }, [payments, dateRange, typeFilter]);

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to move this payment to Trash?')) return;
    try {
      await paymentRepo.softDelete(paymentId);
      success('Payment moved to Trash.');
      loadLedgerData();
    } catch (err: any) {
      error(err.message || 'Failed to delete payment.');
    }
  };

  if (!staff) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Staff Ledger: ${staff.name}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Staff Header & Quick Pay */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)]">
          <div className="flex items-center gap-3">
            <Avatar name={staff.name} src={staff.photo_path || undefined} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[var(--text)]">{staff.name}</h3>
                <Badge variant="outline" size="sm" className="uppercase font-mono text-[10px]">
                  {staff.payment_type}
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {staff.role_title || 'Worker'} • Phone: {staff.phone || 'N/A'} • Rate: ₹{staff.rate || 0}
              </p>
            </div>
          </div>

          <Button
            variant="income"
            size="sm"
            onClick={() => onRecordPayment(staff.id, netDues && netDues.netPayable > 0 ? netDues.netPayable : undefined)}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Pay Dues</span>
          </Button>
        </div>

        {/* Date & Type Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="w-36"
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Date Range</option>
          </Select>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5">
              <DatePicker value={customStart} onChange={(e) => setCustomStart(e.target.value)} placeholder="From" />
              <span>to</span>
              <DatePicker value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} placeholder="To" />
            </div>
          )}

          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-36 ml-auto"
          >
            <option value="all">All Types</option>
            <option value="salary">Salary / Wage</option>
            <option value="advance">Advances</option>
            <option value="bonus">Bonus</option>
            <option value="deduction">Deduction</option>
            <option value="penalty">Penalty</option>
            <option value="reimbursement">Reimbursement</option>
            <option value="loan">Loan</option>
          </Select>
        </div>

        {/* Ledger Balance Summary Cards */}
        {netDues && earningsBreakdown && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Card variant="surface" className="p-3 border border-[var(--border)]">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                Total Earned
              </span>
              <span className="text-base sm:text-lg font-black text-[var(--text)] mt-1 block">
                {formatCurrency(netDues.totalEarned)}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] block truncate mt-0.5">
                {earningsBreakdown.totalPayableDays} days worked
              </span>
            </Card>

            <Card variant="surface" className="p-3 border border-[var(--border)]">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                Salary Paid
              </span>
              <span className="text-base sm:text-lg font-black text-[var(--income)] mt-1 block">
                {formatCurrency(netDues.salaryPaid)}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                Direct disbursements
              </span>
            </Card>

            <Card variant="surface" className="p-3 border border-[var(--border)]">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                Advances O/S
              </span>
              <span className="text-base sm:text-lg font-black text-amber-400 mt-1 block">
                {formatCurrency(netDues.advancesOutstanding)}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                Peshgi / Udhar taken
              </span>
            </Card>

            <Card
              variant="surface"
              className={`p-3 border ${
                netDues.status === 'owed_to_staff'
                  ? 'border-[var(--income)]/50 bg-[var(--income)]/5'
                  : netDues.status === 'owed_by_staff'
                  ? 'border-[var(--expense)]/50 bg-[var(--expense)]/5'
                  : 'border-[var(--border)]'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                Net Balance
              </span>
              <span
                className={`text-base sm:text-lg font-black mt-1 block ${
                  netDues.status === 'owed_to_staff'
                    ? 'text-[var(--income)]'
                    : netDues.status === 'owed_by_staff'
                    ? 'text-[var(--expense)]'
                    : 'text-[var(--text)]'
                }`}
              >
                {formatCurrency(Math.abs(netDues.netPayable))}
              </span>
              <span className="text-[10px] font-semibold block mt-0.5">
                {netDues.status === 'owed_to_staff' && 'Owed to Staff (देना है)'}
                {netDues.status === 'owed_by_staff' && 'Owed by Staff (लेना है)'}
                {netDues.status === 'settled' && 'Settled / No Dues'}
              </span>
            </Card>
          </div>
        )}

        {/* Formula breakdown info bar */}
        {earningsBreakdown && (
          <div className="p-2.5 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border)] text-[11px] text-[var(--text-muted)] leading-relaxed">
            <span className="font-semibold text-[var(--text)]">Formula Breakdown: </span>
            {earningsBreakdown.formulaText}
          </div>
        )}

        {/* Transactions Table / List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
              Payment &amp; Advance Transactions ({filteredPaymentsList.length})
            </h4>
          </div>

          {filteredPaymentsList.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="w-6 h-6" />}
              title="No transactions in this period"
              description="Click 'Pay Dues' or 'Record Payment' to record a wage payout or advance."
            />
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {filteredPaymentsList.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border)] hover:bg-[var(--surface-2)] transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        p.type === 'salary'
                          ? 'bg-[var(--income)]/15 text-[var(--income)]'
                          : p.type === 'advance' || p.type === 'loan'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-purple-500/15 text-purple-400'
                      }`}
                    >
                      {p.type === 'salary' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-[var(--text)] capitalize">
                          {p.type.replace('_', ' ')}
                        </span>
                        <Badge variant="outline" size="sm" className="text-[9px] uppercase">
                          {p.mode || 'Cash'}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] block truncate mt-0.5">
                        {p.pay_date} {p.reference ? `• Ref: ${p.reference}` : ''} {p.note ? `• ${p.note}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-xs sm:text-sm text-[var(--text)]">
                      {formatCurrency(p.amount)}
                    </span>
                    {p.receipt_path && (
                      <button
                        type="button"
                        onClick={() => setPreviewReceiptUrl(p.receipt_path!)}
                        title="View Receipt"
                        className="p-1 rounded-lg hover:bg-[var(--surface)] text-[var(--accent)]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEditPayment(p)}
                      title="Edit"
                      className="p-1 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePayment(p.id)}
                      title="Delete"
                      className="p-1 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Receipt Preview Modal */}
        {previewReceiptUrl && (
          <Modal
            isOpen={!!previewReceiptUrl}
            onClose={() => setPreviewReceiptUrl(null)}
            title="Receipt Voucher Photo"
            maxWidth="md"
          >
            <div className="space-y-3">
              <img
                src={previewReceiptUrl}
                alt="Receipt Voucher"
                className="w-full max-h-[70vh] object-contain rounded-xl border border-[var(--border)]"
              />
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setPreviewReceiptUrl(null)}>
                  Close
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Modal>
  );
};
