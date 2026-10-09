import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { SearchBox } from '@/components/ui/SearchBox';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { PaymentFormModal } from './PaymentFormModal';
import { StaffLedgerModal } from './StaffLedgerModal';
import { MonthSettlementModal } from './MonthSettlementModal';
import { PaymentReceiptModal } from '@/features/reports/PaymentReceiptModal';
import { SalarySlipModal } from '@/features/reports/SalarySlipModal';
import { StaffHistoryModal } from '@/features/history/StaffHistoryModal';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useOrg } from '@/features/org/orgContext';
import { useToast } from '@/components/ui/Toast';
import { localDb, LocalStaff, LocalPayment, LocalPeriodClosing } from '@/lib/db/dexie';
import { paymentRepo } from '@/lib/db/repository';
import {
  calculateStaffEarnings,
  calculateStaffNetDues,
  roundMoney,
} from '@/lib/calculations/salaryCalculations';
import {
  CreditCard,
  PlusCircle,
  ExternalLink,
  CalendarCheck,
  Eye,
  EyeOff,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Layers,
  Users,
  Search,
  Trash2,
  Edit2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Receipt,
  History,
  FileText,
} from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const { t, formatCurrency, formatDate } = useI18n();
  const { currentOrg, role } = useOrg();
  const { success, error } = useToast();

  const advancedCalcUrl = import.meta.env.VITE_ADVANCED_CALCULATOR_URL || 'https://www.rozfiber.com/calculator';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'transactions' | 'ledger' | 'settlements'>('transactions');

  // Privacy mask toggle (stored in localStorage)
  const [isPrivacyMasked, setIsPrivacyMasked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('staff_manager_privacy_mask') === 'true';
    }
    return false;
  });

  const togglePrivacyMask = () => {
    const nextVal = !isPrivacyMasked;
    setIsPrivacyMasked(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('staff_manager_privacy_mask', String(nextVal));
    }
  };

  const renderAmount = (amount: number, customClass = '') => {
    if (isPrivacyMasked) {
      return <span className={`font-mono ${customClass}`}>••••••</span>;
    }
    return <span className={customClass}>{formatCurrency(amount)}</span>;
  };

  // Data states
  const [staffList, setStaffList] = useState<LocalStaff[]>([]);
  const [payments, setPayments] = useState<LocalPayment[]>([]);
  const [periodClosings, setPeriodClosings] = useState<LocalPeriodClosing[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');

  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<LocalPayment | null>(null);
  const [prefillStaffId, setPrefillStaffId] = useState<string>('');
  const [prefillAmount, setPrefillAmount] = useState<number | undefined>();
  const [prefillPeriodStart, setPrefillPeriodStart] = useState<string>('');
  const [prefillPeriodEnd, setPrefillPeriodEnd] = useState<string>('');

  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedStaffForLedger, setSelectedStaffForLedger] = useState<LocalStaff | null>(null);

  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<LocalPayment | null>(null);
  const [salarySlipStaffId, setSalarySlipStaffId] = useState<string | null>(null);
  const [historyStaff, setHistoryStaff] = useState<LocalStaff | null>(null);

  // Load all payments and staff
  const loadData = async () => {
    if (!currentOrg?.id) return;

    const s = await localDb.staff
      .where('org_id')
      .equals(currentOrg.id)
      .filter((staff) => !staff.deleted_at)
      .toArray();
    setStaffList(s);

    const p = await localDb.payments
      .where('org_id')
      .equals(currentOrg.id)
      .filter((payment) => !payment.deleted_at)
      .toArray();
    p.sort((a, b) => b.pay_date.localeCompare(a.pay_date));
    setPayments(p);

    const closings = await localDb.period_closings
      .where('org_id')
      .equals(currentOrg.id)
      .filter((c) => !c.deleted_at)
      .toArray();
    closings.sort((a, b) => b.period_end.localeCompare(a.period_end));
    setPeriodClosings(closings);
  };

  useEffect(() => {
    loadData();
  }, [currentOrg]);

  // Overall Financial Totals
  const overallStats = useMemo(() => {
    let totalSalaryPaid = 0;
    let totalAdvancesTaken = 0;
    let totalAdvancesRecovered = 0;
    let totalBonuses = 0;
    let totalDeductions = 0;

    payments.forEach((p) => {
      const amt = roundMoney(p.amount);
      if (p.type === 'salary') totalSalaryPaid = roundMoney(totalSalaryPaid + amt);
      else if (p.type === 'advance' || p.type === 'loan') totalAdvancesTaken = roundMoney(totalAdvancesTaken + amt);
      else if (p.type === 'loan_repayment') totalAdvancesRecovered = roundMoney(totalAdvancesRecovered + amt);
      else if (p.type === 'bonus') totalBonuses = roundMoney(totalBonuses + amt);
      else if (p.type === 'deduction' || p.type === 'penalty') totalDeductions = roundMoney(totalDeductions + amt);
    });

    const netAdvancesOutstanding = roundMoney(totalAdvancesTaken - totalAdvancesRecovered);

    return {
      totalSalaryPaid,
      netAdvancesOutstanding,
      totalBonuses,
      totalDeductions,
    };
  }, [payments]);

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (staffFilter !== 'all' && p.staff_id !== staffFilter) return false;
      if (modeFilter !== 'all' && p.mode !== modeFilter) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const staff = staffList.find((s) => s.id === p.staff_id);
        const nameMatch = staff?.name.toLowerCase().includes(query);
        const noteMatch = p.note?.toLowerCase().includes(query);
        const refMatch = p.reference?.toLowerCase().includes(query);
        return nameMatch || noteMatch || refMatch;
      }

      return true;
    });
  }, [payments, staffList, typeFilter, staffFilter, modeFilter, search]);

  // Staff summary calculations for the ledger tab
  const staffLedgerSummaries = useMemo(() => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();
    const startOfMonth = new Date(curYear, curMonth, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(curYear, curMonth + 1, 0).toISOString().split('T')[0];

    return staffList
      .filter((s) => s.status === 'active')
      .map((staff) => {
        const staffPayments = payments.filter((p) => p.staff_id === staff.id);

        let salaryPaid = 0;
        let advancesTaken = 0;
        let advancesRecovered = 0;

        staffPayments.forEach((p) => {
          const amt = roundMoney(p.amount);
          if (p.type === 'salary') salaryPaid = roundMoney(salaryPaid + amt);
          else if (p.type === 'advance' || p.type === 'loan') advancesTaken = roundMoney(advancesTaken + amt);
          else if (p.type === 'loan_repayment') advancesRecovered = roundMoney(advancesRecovered + amt);
        });

        const advanceBalance = roundMoney(advancesTaken - advancesRecovered);

        return {
          staff,
          salaryPaid,
          advanceBalance,
          transactionCount: staffPayments.length,
        };
      });
  }, [staffList, payments]);

  // Handlers
  const handleOpenNewPayment = (staffId = '', amount?: number, pStart = '', pEnd = '') => {
    setPaymentToEdit(null);
    setPrefillStaffId(staffId);
    setPrefillAmount(amount);
    setPrefillPeriodStart(pStart);
    setPrefillPeriodEnd(pEnd);
    setIsPaymentModalOpen(true);
  };

  const handleEditPayment = (payment: LocalPayment) => {
    setPaymentToEdit(payment);
    setIsPaymentModalOpen(true);
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Move this payment record to Trash?')) return;
    try {
      await paymentRepo.softDelete(id);
      success('Payment moved to Trash.');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to delete payment.');
    }
  };

  const handleOpenStaffLedger = (staff: LocalStaff) => {
    setSelectedStaffForLedger(staff);
    setIsLedgerModalOpen(true);
  };

  // Check supervisor role permissions
  if (role === 'supervisor') {
    return (
      <div className="p-6 text-center space-y-3">
        <Lock className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-[var(--text)]">Access Restricted</h2>
        <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
          Supervisor role has access to daily attendance and work logging only. Financial payouts and salary details are reserved for managers and accountants.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">
              {t('payments.title')}
            </h1>
            <button
              type="button"
              onClick={togglePrivacyMask}
              title={isPrivacyMasked ? 'Reveal amounts' : 'Mask amounts for privacy'}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] transition cursor-pointer"
            >
              {isPrivacyMasked ? (
                <EyeOff className="w-4 h-4 text-amber-400" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            {t('payments.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {advancedCalcUrl && (
            <a
              href={advancedCalcUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--surface)] transition active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{t('calc.advanced')}</span>
            </a>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettlementModalOpen(true)}
          >
            <CalendarCheck className="w-4 h-4 text-[var(--accent)]" />
            <span>{t('payments.settleMonth')}</span>
          </Button>

          <Button
            variant="income"
            size="sm"
            onClick={() => handleOpenNewPayment()}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('payments.recordPayment')}</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="surface" className="p-3.5 border border-[var(--border)]">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
            Salary Paid
          </span>
          <div className="mt-1">
            {renderAmount(overallStats.totalSalaryPaid, 'text-lg sm:text-xl font-black text-[var(--income)]')}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
            Total wage payouts
          </span>
        </Card>

        <Card variant="surface" className="p-3.5 border border-[var(--border)]">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
            Advances Outstanding
          </span>
          <div className="mt-1">
            {renderAmount(overallStats.netAdvancesOutstanding, 'text-lg sm:text-xl font-black text-amber-400')}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
            Peshgi / Udhar recoverable
          </span>
        </Card>

        <Card variant="surface" className="p-3.5 border border-[var(--border)]">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
            Bonuses Awarded
          </span>
          <div className="mt-1">
            {renderAmount(overallStats.totalBonuses, 'text-lg sm:text-xl font-black text-purple-400')}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
            Incentives added
          </span>
        </Card>

        <Card variant="surface" className="p-3.5 border border-[var(--border)]">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
            Deductions &amp; Fines
          </span>
          <div className="mt-1">
            {renderAmount(overallStats.totalDeductions, 'text-lg sm:text-xl font-black text-[var(--expense)]')}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
            Katoti and penalties
          </span>
        </Card>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'transactions'
              ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>{t('payments.allTransactions')} ({filteredPayments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'ledger'
              ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('payments.ledger')} ({staffList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settlements')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'settlements'
              ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Closed Periods ({periodClosings.length})</span>
        </button>
      </div>

      {/* TAB 1: ALL TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="space-y-3">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search by staff, note, ref..."
            />

            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Payment Types</option>
              <option value="salary">Salary / Wage</option>
              <option value="advance">Advance (Peshgi)</option>
              <option value="bonus">Bonus / Incentive</option>
              <option value="deduction">Deduction</option>
              <option value="penalty">Penalty</option>
              <option value="reimbursement">Reimbursement</option>
              <option value="loan">Staff Loan</option>
            </Select>

            <Select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
            >
              <option value="all">All Staff Members</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>

            <Select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
            >
              <option value="all">All Payment Modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </Select>
          </div>

          {/* Transactions List */}
          {filteredPayments.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="w-8 h-8" />}
              title="No payment records found"
              description="Click 'Record Payment' to enter wages, advances (udhar/peshgi), bonuses or deductions."
              action={
                <Button
                  variant="income"
                  size="sm"
                  onClick={() => handleOpenNewPayment()}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Record First Payment</span>
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {filteredPayments.map((p) => {
                const staff = staffList.find((s) => s.id === p.staff_id);
                return (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] hover:bg-[var(--surface-2)] transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          p.type === 'salary'
                            ? 'bg-[var(--income)]/15 text-[var(--income)]'
                            : p.type === 'advance' || p.type === 'loan'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-purple-500/15 text-purple-400'
                        }`}
                      >
                        {p.type === 'salary' ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownLeft className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[var(--text)]">
                            {staff?.name || 'Staff Member'}
                          </span>
                          <Badge variant="outline" size="sm" className="capitalize text-[10px]">
                            {p.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="secondary" size="sm" className="uppercase text-[9px]">
                            {p.mode || 'Cash'}
                          </Badge>
                        </div>

                        <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                          <span>{p.pay_date}</span>
                          {p.reference && <span> • Ref: {p.reference}</span>}
                          {p.note && <span> • {p.note}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[var(--border)]">
                      <div className="text-right">
                        {renderAmount(p.amount, 'text-base font-black text-[var(--text)]')}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setReceiptPayment(p)}
                          title="Print / Share Receipt"
                          className="p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--accent)] transition cursor-pointer"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditPayment(p)}
                          title="Edit"
                          className="p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p.id)}
                          title="Delete to Trash"
                          className="p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-red-400 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STAFF LEDGER OVERVIEW */}
      {activeTab === 'ledger' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffLedgerSummaries.map(({ staff, salaryPaid, advanceBalance, transactionCount }) => (
              <Card
                key={staff.id}
                variant="surface"
                className="p-4 border border-[var(--border)] space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={staff.name} src={staff.photo_path || undefined} size="md" />
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-[var(--text)] truncate">{staff.name}</h3>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          {staff.role_title || 'Worker'} • ₹{staff.rate || 0}/{staff.payment_type}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--border)] text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">
                        Salary Paid
                      </span>
                      {renderAmount(salaryPaid, 'font-bold text-[var(--income)]')}
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">
                        Advances O/S
                      </span>
                      {renderAmount(advanceBalance, 'font-bold text-amber-400')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--border)]">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenStaffLedger(staff)}
                  >
                    <span>Ledger</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    title="Salary Slip"
                    onClick={() => setSalarySlipStaffId(staff.id)}
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    title="Work & Payment History"
                    onClick={() => setHistoryStaff(staff)}
                  >
                    <History className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="income"
                    size="sm"
                    onClick={() => handleOpenNewPayment(staff.id)}
                  >
                    <span>Pay</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CLOSED PERIODS & AUDIT LOG */}
      {activeTab === 'settlements' && (
        <div className="space-y-3">
          {periodClosings.length === 0 ? (
            <EmptyState
              icon={<Lock className="w-8 h-8" />}
              title="No closed periods recorded yet"
              description="Use the 'Settle Month' button at the top to compute final dues and lock a month."
            />
          ) : (
            <div className="space-y-2">
              {periodClosings.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        c.status === 'closed'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-emerald-500/15 text-emerald-400'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-[var(--text)]">
                          Period: {c.period_start} to {c.period_end}
                        </span>
                        <Badge
                          variant={c.status === 'closed' ? 'warning' : 'outline'}
                          size="sm"
                          className="capitalize text-[10px]"
                        >
                          {c.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {c.note || 'Period settlement closing record'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Form Modal */}
      {isPaymentModalOpen && (
        <PaymentFormModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => loadData()}
          initialStaffId={prefillStaffId}
          initialAmount={prefillAmount}
          initialPeriodStart={prefillPeriodStart}
          initialPeriodEnd={prefillPeriodEnd}
          paymentToEdit={paymentToEdit}
        />
      )}

      {/* Staff Ledger Modal */}
      {isLedgerModalOpen && (
        <StaffLedgerModal
          isOpen={isLedgerModalOpen}
          onClose={() => setIsLedgerModalOpen(false)}
          staff={selectedStaffForLedger}
          onRecordPayment={(sId, amt) => handleOpenNewPayment(sId, amt)}
          onEditPayment={(p) => handleEditPayment(p)}
        />
      )}

      {/* Month Settlement Modal */}
      {isSettlementModalOpen && (
        <MonthSettlementModal
          isOpen={isSettlementModalOpen}
          onClose={() => {
            setIsSettlementModalOpen(false);
            loadData();
          }}
          onPayStaff={(sId, amt, pStart, pEnd) => {
            setIsSettlementModalOpen(false);
            handleOpenNewPayment(sId, amt, pStart, pEnd);
          }}
        />
      )}

      {/* Payment Receipt Modal */}
      {receiptPayment && (
        <PaymentReceiptModal
          isOpen={Boolean(receiptPayment)}
          onClose={() => setReceiptPayment(null)}
          payment={receiptPayment}
          staff={staffList.find((s) => s.id === receiptPayment.staff_id) || null}
        />
      )}

      {/* Salary Slip Modal */}
      {salarySlipStaffId && (
        <SalarySlipModal
          isOpen={Boolean(salarySlipStaffId)}
          onClose={() => setSalarySlipStaffId(null)}
          staffId={salarySlipStaffId}
        />
      )}

      {/* Staff History Modal */}
      {historyStaff && (
        <StaffHistoryModal
          isOpen={Boolean(historyStaff)}
          onClose={() => setHistoryStaff(null)}
          staff={historyStaff}
        />
      )}
    </div>
  );
};
