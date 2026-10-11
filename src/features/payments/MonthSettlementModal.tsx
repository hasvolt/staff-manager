import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useOrg } from '@/features/org/orgContext';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useToast } from '@/components/ui/Toast';
import { localDb, LocalStaff, LocalPayment, LocalAttendanceEntry, LocalWorkEntry, LocalPeriodClosing } from '@/lib/db/dexie';
import { periodClosingRepo } from '@/lib/db/repository';
import {
  calculateStaffEarnings,
  calculateStaffNetDues,
  getDaysInMonth,
  MonthCalculationMode,
  roundMoney,
} from '@/lib/calculations/salaryCalculations';
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  CreditCard,
  DollarSign,
  Info,
  HelpCircle,
  FileCheck,
} from 'lucide-react';

export interface MonthSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPayStaff: (staffId: string, amount: number, periodStart: string, periodEnd: string) => void;
}

export const MonthSettlementModal: React.FC<MonthSettlementModalProps> = ({
  isOpen,
  onClose,
  onPayStaff,
}) => {
  const { currentOrg, role } = useOrg();
  const { t, formatCurrency } = useI18n();
  const { success, error, warning } = useToast();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [calcMode, setCalcMode] = useState<MonthCalculationMode>(() => {
    return currentOrg?.settings?.month_calc_mode === 'fixed30' || currentOrg?.settings?.month_calc_mode === 'fixed_30'
      ? 'fixed_30'
      : 'calendar_days';
  });

  useEffect(() => {
    if (currentOrg?.settings?.month_calc_mode) {
      setCalcMode(
        currentOrg.settings.month_calc_mode === 'fixed30' || currentOrg.settings.month_calc_mode === 'fixed_30'
          ? 'fixed_30'
          : 'calendar_days'
      );
    }
  }, [currentOrg?.settings?.month_calc_mode]);

  const [staffList, setStaffList] = useState<LocalStaff[]>([]);
  const [attendanceEntries, setAttendanceEntries] = useState<LocalAttendanceEntry[]>([]);
  const [workEntries, setWorkEntries] = useState<LocalWorkEntry[]>([]);
  const [payments, setPayments] = useState<LocalPayment[]>([]);
  const [currentClosing, setCurrentClosing] = useState<LocalPeriodClosing | null>(null);

  // Unlock dialog state
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [isProcessingClosing, setIsProcessingClosing] = useState(false);

  // Month date range
  const { startDate, endDate, daysCount } = useMemo(() => {
    const days = getDaysInMonth(selectedYear, selectedMonth);
    const mStr = String(selectedMonth + 1).padStart(2, '0');
    const start = `${selectedYear}-${mStr}-01`;
    const end = `${selectedYear}-${mStr}-${String(days).padStart(2, '0')}`;
    return { startDate: start, endDate: end, daysCount: days };
  }, [selectedYear, selectedMonth]);

  const loadData = async () => {
    if (!currentOrg?.id) return;

    // Load active staff
    const s = await localDb.staff
      .where('org_id')
      .equals(currentOrg.id)
      .filter((staff) => !staff.deleted_at && staff.status === 'active')
      .toArray();
    setStaffList(s);

    // Load attendance for month
    const a = await localDb.attendance_entries
      .where('org_id')
      .equals(currentOrg.id)
      .filter((entry) => !entry.deleted_at && entry.work_date >= startDate && entry.work_date <= endDate)
      .toArray();
    setAttendanceEntries(a);

    // Load work entries for month
    const w = await localDb.work_entries
      .where('org_id')
      .equals(currentOrg.id)
      .filter((entry) => !entry.deleted_at && entry.work_date >= startDate && entry.work_date <= endDate)
      .toArray();
    setWorkEntries(w);

    // Load payments for month
    const p = await localDb.payments
      .where('org_id')
      .equals(currentOrg.id)
      .filter((payment) => !payment.deleted_at && payment.pay_date >= startDate && payment.pay_date <= endDate)
      .toArray();
    setPayments(p);

    // Check period closing
    const closing = await localDb.period_closings
      .where('org_id')
      .equals(currentOrg.id)
      .filter(
        (c) =>
          !c.deleted_at &&
          c.status === 'closed' &&
          c.period_start === startDate &&
          c.period_end === endDate
      )
      .first();

    setCurrentClosing(closing || null);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, currentOrg, startDate, endDate]);

  // Compute dues for all staff
  const staffSettlements = useMemo(() => {
    return staffList.map((staff) => {
      const earnings = calculateStaffEarnings({
        staff,
        startDate,
        endDate,
        attendanceEntries,
        workEntries,
        monthMode: calcMode,
      });

      const dues = calculateStaffNetDues({
        staffId: staff.id,
        totalEarned: earnings.totalEarned,
        payments,
      });

      return {
        staff,
        earnings,
        dues,
      };
    });
  }, [staffList, startDate, endDate, attendanceEntries, workEntries, payments, calcMode]);

  // Totals for the month
  const totals = useMemo(() => {
    let totalEarned = 0;
    let totalPaid = 0;
    let totalAdvances = 0;
    let totalNetPayable = 0;

    staffSettlements.forEach(({ dues }) => {
      totalEarned = roundMoney(totalEarned + dues.totalEarned);
      totalPaid = roundMoney(totalPaid + dues.salaryPaid);
      totalAdvances = roundMoney(totalAdvances + dues.advancesOutstanding);
      if (dues.netPayable > 0) {
        totalNetPayable = roundMoney(totalNetPayable + dues.netPayable);
      }
    });

    return { totalEarned, totalPaid, totalAdvances, totalNetPayable };
  }, [staffSettlements]);

  // Close & Lock Period
  const handleLockPeriod = async () => {
    if (!currentOrg) return;
    if (role !== 'owner' && role !== 'manager') {
      error('Only owner or manager can lock settlement periods.');
      return;
    }

    setIsProcessingClosing(true);
    try {
      await periodClosingRepo.create({
        org_id: currentOrg.id,
        period_start: startDate,
        period_end: endDate,
        status: 'closed',
        note: `Period closed for ${startDate} to ${endDate}. Total payable: ${totals.totalNetPayable}`,
      });

      success(`Month locked successfully. Edits to attendance & payments in this month are now restricted.`);
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to lock period.');
    } finally {
      setIsProcessingClosing(false);
    }
  };

  // Unlock Period (Owner Only)
  const handleUnlockPeriod = async () => {
    if (!currentOrg || !currentClosing) return;
    if (role !== 'owner') {
      error('Only the business owner can unlock a closed period.');
      return;
    }

    setIsProcessingClosing(true);
    try {
      await periodClosingRepo.update(currentClosing.id, {
        status: 'reopened',
        note: `Reopened by owner on ${new Date().toISOString()}`,
      });

      success('Period unlocked. Changes can now be made.');
      setShowUnlockConfirm(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to unlock period.');
    } finally {
      setIsProcessingClosing(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Month Settlement & Period Closing"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Month Picker & Calculation Mode Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-36 font-semibold"
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx}>
                  {name}
                </option>
              ))}
            </Select>

            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-24 font-semibold"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--surface)] px-2.5 py-1.5 rounded-xl border border-[var(--border)]">
              <span>Salary Mode:</span>
              <button
                type="button"
                onClick={() => setCalcMode('fixed_30')}
                className={`px-2 py-0.5 rounded-lg font-semibold transition ${
                  calcMode === 'fixed_30'
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Fixed 30
              </button>
              <button
                type="button"
                onClick={() => setCalcMode('calendar_days')}
                className={`px-2 py-0.5 rounded-lg font-semibold transition ${
                  calcMode === 'calendar_days'
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {daysCount} Days
              </button>
            </div>
          </div>
        </div>

        {/* Lock / Unlock Banner */}
        {currentClosing ? (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-400">
                  This Period is Closed &amp; Locked ({startDate} to {endDate})
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Attendance and payments within this month cannot be edited unless reopened.
                </p>
              </div>
            </div>

            {role === 'owner' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUnlockConfirm(true)}
                disabled={isProcessingClosing}
              >
                <Unlock className="w-4 h-4 text-amber-400" />
                <span>Unlock Month</span>
              </Button>
            ) : (
              <Badge variant="outline" className="text-xs text-amber-400">
                Locked by Owner
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface-2)]/40 border border-[var(--border)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Info className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span>
                Period is currently open for edits. When you finish payouts, you can lock it to preserve audit records.
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLockPeriod}
              disabled={isProcessingClosing}
            >
              <Lock className="w-4 h-4 text-[var(--accent)]" />
              <span>Lock Period</span>
            </Button>
          </div>
        )}

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Card variant="surface" className="p-3 border border-[var(--border)]">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
              Total Wages Earned
            </span>
            <span className="text-base sm:text-lg font-black text-[var(--text)] mt-1 block">
              {formatCurrency(totals.totalEarned)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
              All staff attendance &amp; work
            </span>
          </Card>

          <Card variant="surface" className="p-3 border border-[var(--border)]">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
              Salary Paid So Far
            </span>
            <span className="text-base sm:text-lg font-black text-[var(--income)] mt-1 block">
              {formatCurrency(totals.totalPaid)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
              Direct disbursements
            </span>
          </Card>

          <Card variant="surface" className="p-3 border border-[var(--border)]">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
              Advances Outstanding
            </span>
            <span className="text-base sm:text-lg font-black text-amber-400 mt-1 block">
              {formatCurrency(totals.totalAdvances)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
              Pending peshgi/udhar
            </span>
          </Card>

          <Card variant="surface" className="p-3 border border-[var(--income)]/50 bg-[var(--income)]/5">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
              Net Payable Now
            </span>
            <span className="text-base sm:text-lg font-black text-[var(--income)] mt-1 block">
              {formatCurrency(totals.totalNetPayable)}
            </span>
            <span className="text-[10px] text-[var(--income)] font-semibold block mt-0.5">
              Balance due to pay
            </span>
          </Card>
        </div>

        {/* Staff Dues Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
            Staff Dues Breakdown ({staffSettlements.length})
          </h4>

          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {staffSettlements.map(({ staff, earnings, dues }) => (
              <div
                key={staff.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border)] hover:bg-[var(--surface-2)] transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={staff.name} src={staff.photo_path || undefined} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-[var(--text)]">{staff.name}</span>
                      <Badge variant="outline" size="sm" className="text-[9px] uppercase">
                        {staff.payment_type}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] block truncate mt-0.5">
                      P: {earnings.totalPresent} • H: {earnings.totalHalf} • A: {earnings.totalAbsent} •
                      OT: {earnings.overtimeHours} hrs • Rate: ₹{earnings.rateUsed}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-[var(--border)]">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-[var(--text-muted)] block">
                      Earned: {formatCurrency(dues.totalEarned)}
                    </span>
                    <span
                      className={`font-black text-xs sm:text-sm block ${
                        dues.netPayable > 0
                          ? 'text-[var(--income)]'
                          : dues.netPayable < 0
                          ? 'text-[var(--expense)]'
                          : 'text-[var(--text)]'
                      }`}
                    >
                      {dues.netPayable > 0
                        ? `Due: ${formatCurrency(dues.netPayable)}`
                        : dues.netPayable < 0
                        ? `Adv: ${formatCurrency(Math.abs(dues.netPayable))}`
                        : 'Settled'}
                    </span>
                  </div>

                  {dues.netPayable > 0 && !currentClosing && (
                    <Button
                      variant="income"
                      size="sm"
                      onClick={() => onPayStaff(staff.id, dues.netPayable, startDate, endDate)}
                    >
                      <span>Pay</span>
                    </Button>
                  )}

                  {dues.netPayable <= 0 && (
                    <Badge variant="success" size="sm" className="text-[10px]">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Clear
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Unlock Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showUnlockConfirm}
        onClose={() => setShowUnlockConfirm(false)}
        onConfirm={handleUnlockPeriod}
        title="Unlock Settlement Period"
        description="Are you sure you want to reopen this closed settlement period? Any changes made to past attendance or payments will be recorded in the audit log."
        confirmText="Yes, Unlock Month"
        variant="warning"
      />
    </Modal>
  );
};
