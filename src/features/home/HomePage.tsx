import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { StaffFormModal } from '@/features/staff/StaffFormModal';
import { WorkEntryModal } from '@/features/work/WorkEntryModal';
import { SitesModal } from '@/features/work/SitesModal';
import { WorkTypesModal } from '@/features/work/WorkTypesModal';
import { PaymentFormModal } from '@/features/payments/PaymentFormModal';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useOrg } from '@/features/org/orgContext';
import { useAuth } from '@/features/auth/authContext';
import { useCalculator } from '@/features/calculator/calculatorContext';
import { useToast } from '@/components/ui/Toast';
import { localDb, LocalStaff, LocalAttendanceEntry, LocalPayment, LocalSite } from '@/lib/db/dexie';
import { attendanceRepo, staffRepo } from '@/lib/db/repository';
import { syncEngine } from '@/lib/sync/syncEngine';
import {
  calculateStaffEarnings,
  calculateStaffNetDues,
  getDaysInMonth,
  roundMoney,
} from '@/lib/calculations/salaryCalculations';
import {
  Users,
  CheckCircle2,
  XCircle,
  UserPlus,
  CalendarCheck,
  CreditCard,
  BarChart3,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  MapPin,
  Briefcase,
  Layers,
  Eye,
  EyeOff,
  ExternalLink,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const { t, formatCurrency } = useI18n();
  const { currentOrg, role } = useOrg();
  const { isLocalMode } = useAuth();
  const { success, error, info } = useToast();
  const navigate = useNavigate();

  const advancedCalcUrl = import.meta.env.VITE_ADVANCED_CALCULATOR_URL || 'https://www.rozfiber.com/calculator';

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

  const [activeStaffCount, setActiveStaffCount] = useState(0);
  const [presentTodayCount, setPresentTodayCount] = useState(0);
  const [absentTodayCount, setAbsentTodayCount] = useState(0);
  const [staffPreviewList, setStaffPreviewList] = useState<LocalStaff[]>([]);
  const [allActiveStaff, setAllActiveStaff] = useState<LocalStaff[]>([]);
  const [todayAttendanceMap, setTodayAttendanceMap] = useState<Record<string, LocalAttendanceEntry>>({});
  const [sitesList, setSitesList] = useState<LocalSite[]>([]);
  const [allPayments, setAllPayments] = useState<LocalPayment[]>([]);

  // Financial Dashboard States for this month
  const [monthTotalPayable, setMonthTotalPayable] = useState(0);
  const [monthTotalPaid, setMonthTotalPaid] = useState(0);
  const [totalAdvancesOutstanding, setTotalAdvancesOutstanding] = useState(0);
  const [costBySite, setCostBySite] = useState<Array<{ name: string; amount: number }>>([]);
  const [costByRole, setCostByRole] = useState<Array<{ name: string; amount: number }>>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<Array<{ label: string; amount: number }>>([]);

  // Modal launchers
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isSitesModalOpen, setIsSitesModalOpen] = useState(false);
  const [isWorkTypesModalOpen, setIsWorkTypesModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadDashboardData = async () => {
    if (!currentOrg?.id) return;

    // 1. Staff count
    const activeStaff = await localDb.staff
      .where('org_id')
      .equals(currentOrg.id)
      .filter((s) => !s.deleted_at && s.status === 'active')
      .toArray();

    setActiveStaffCount(activeStaff.length);
    setStaffPreviewList(activeStaff.slice(0, 6));
    setAllActiveStaff(activeStaff);

    // 2. Attendance count for today
    const todayEntries = await localDb.attendance_entries
      .where('org_id')
      .equals(currentOrg.id)
      .filter((a) => !a.deleted_at && a.work_date === todayStr)
      .toArray();

    let present = 0;
    let absent = 0;
    const map: Record<string, LocalAttendanceEntry> = {};

    todayEntries.forEach((e) => {
      map[e.staff_id] = e;
      if (e.status === 'present' || e.status === 'half') present++;
      else if (e.status === 'absent') absent++;
    });

    setPresentTodayCount(present);
    setAbsentTodayCount(absent);
    setTodayAttendanceMap(map);

    // 3. Sites
    const sites = await localDb.sites
      .where('org_id')
      .equals(currentOrg.id)
      .filter((s) => !s.deleted_at)
      .toArray();
    setSitesList(sites);

    // 4. Financial Calculations for Current Month (skip for supervisor)
    if (role !== 'supervisor') {
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth();
      const daysInCurMonth = getDaysInMonth(curYear, curMonth);
      const mStr = String(curMonth + 1).padStart(2, '0');
      const startOfMonth = `${curYear}-${mStr}-01`;
      const endOfMonth = `${curYear}-${mStr}-${String(daysInCurMonth).padStart(2, '0')}`;

      // Payments
      const payments = await localDb.payments
        .where('org_id')
        .equals(currentOrg.id)
        .filter((p) => !p.deleted_at)
        .toArray();
      setAllPayments(payments);

      // Month attendance & work
      const monthAttendance = await localDb.attendance_entries
        .where('org_id')
        .equals(currentOrg.id)
        .filter((a) => !a.deleted_at && a.work_date >= startOfMonth && a.work_date <= endOfMonth)
        .toArray();

      const monthWork = await localDb.work_entries
        .where('org_id')
        .equals(currentOrg.id)
        .filter((w) => !w.deleted_at && w.work_date >= startOfMonth && w.work_date <= endOfMonth)
        .toArray();

      let totalPayable = 0;
      let totalPaidThisMonth = 0;
      let totalAdvTaken = 0;
      let totalAdvRecovered = 0;

      const siteCostMap: Record<string, number> = {};
      const roleCostMap: Record<string, number> = {};

      // Calculate dues per staff
      activeStaff.forEach((staff) => {
        const earnings = calculateStaffEarnings({
          staff,
          startDate: startOfMonth,
          endDate: endOfMonth,
          attendanceEntries: monthAttendance,
          workEntries: monthWork,
          monthMode: 'fixed_30',
        });

        const staffMonthPayments = payments.filter(
          (p) => p.staff_id === staff.id && p.pay_date >= startOfMonth && p.pay_date <= endOfMonth
        );

        const dues = calculateStaffNetDues({
          staffId: staff.id,
          totalEarned: earnings.totalEarned,
          payments: staffMonthPayments,
        });

        if (dues.netPayable > 0) {
          totalPayable = roundMoney(totalPayable + dues.netPayable);
        }

        // Cost by site (staff default_site or 'Unassigned')
        const siteName =
          sites.find((s) => s.id === staff.default_site_id)?.name || 'General / Unassigned';
        siteCostMap[siteName] = roundMoney((siteCostMap[siteName] || 0) + earnings.totalEarned);

        // Cost by role
        const roleTitle = staff.role_title || 'Worker';
        roleCostMap[roleTitle] = roundMoney((roleCostMap[roleTitle] || 0) + earnings.totalEarned);
      });

      // All-time advances outstanding
      payments.forEach((p) => {
        const amt = roundMoney(p.amount);
        if (p.pay_date >= startOfMonth && p.pay_date <= endOfMonth && p.type === 'salary') {
          totalPaidThisMonth = roundMoney(totalPaidThisMonth + amt);
        }
        if (p.type === 'advance' || p.type === 'loan') {
          totalAdvTaken = roundMoney(totalAdvTaken + amt);
        } else if (p.type === 'loan_repayment') {
          totalAdvRecovered = roundMoney(totalAdvRecovered + amt);
        }
      });

      setMonthTotalPayable(totalPayable);
      setMonthTotalPaid(totalPaidThisMonth);
      setTotalAdvancesOutstanding(roundMoney(totalAdvTaken - totalAdvRecovered));

      // Top sites by cost
      const siteList = Object.entries(siteCostMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4);
      setCostBySite(siteList);

      // Top roles by cost
      const roleList = Object.entries(roleCostMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4);
      setCostByRole(roleList);

      // Monthly Trend (Last 4 months)
      const trendList = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 3; i >= 0; i--) {
        const d = new Date(curYear, curMonth - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const mStart = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const mEnd = `${y}-${String(m + 1).padStart(2, '0')}-${String(getDaysInMonth(y, m)).padStart(2, '0')}`;

        const mPaid = payments
          .filter((p) => !p.deleted_at && p.pay_date >= mStart && p.pay_date <= mEnd && p.type === 'salary')
          .reduce((sum, p) => sum + roundMoney(p.amount), 0);

        trendList.push({
          label: `${monthNames[m]} ${y}`,
          amount: roundMoney(mPaid),
        });
      }
      setMonthlyTrend(trendList);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentOrg, role]);

  const handleQuickMark = async (staffId: string, status: 'present' | 'absent' | 'half') => {
    if (!currentOrg) return;
    try {
      const existing = todayAttendanceMap[staffId];
      if (existing) {
        const updated = await attendanceRepo.update(existing.id, {
          status,
          updated_at: new Date().toISOString(),
        });
        setTodayAttendanceMap((prev) => ({ ...prev, [staffId]: updated }));
      } else {
        const created = await attendanceRepo.create({
          org_id: currentOrg.id,
          staff_id: staffId,
          work_date: todayStr,
          status,
          overtime_hours: 0,
        });
        setTodayAttendanceMap((prev) => ({ ...prev, [staffId]: created }));
      }
      loadDashboardData();
    } catch {
      error('Failed to record attendance');
    }
  };

  const isSupervisor = role === 'supervisor';
  const maxTrendAmount = useMemo(() => {
    const max = Math.max(...monthlyTrend.map((t) => t.amount), 1);
    return max;
  }, [monthlyTrend]);

  return (
    <div className="space-y-6 animate-in fade-in text-left pb-10">
      {/* Welcome & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
              {currentOrg?.name || t('home.title')}
            </h1>
            {!isSupervisor && (
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
            )}
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            {t('tagline')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {advancedCalcUrl && (
            <a
              href={advancedCalcUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--surface)] transition active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{t('calc.advanced')}</span>
            </a>
          )}

          <Badge variant="accent">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isLocalMode ? 'Local Mode' : 'Cloud Sync Active'}</span>
          </Badge>

          <button
            type="button"
            onClick={async () => {
              info('Syncing changes...');
              const res = await syncEngine.syncNow(currentOrg?.id);
              if (res.success) success('Synced!');
              else error(res.message);
              loadDashboardData();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--surface)] transition active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Staff & Daily Attendance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card
          variant="gradient"
          interactive
          onClick={() => navigate('/staff')}
          className="flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              {t('home.totalStaff')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[var(--surface)]/40 flex items-center justify-center text-[var(--accent)] shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight">
              {activeStaffCount}
            </div>
            <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
              Active staff enrolled
            </span>
          </div>
        </Card>

        <Card
          variant="gradient"
          interactive
          onClick={() => navigate('/attendance')}
          className="flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              {t('home.presentToday')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[var(--income)]/20 flex items-center justify-center text-[var(--income)] shadow-2xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--income)] tracking-tight">
              {presentTodayCount}
            </div>
            <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
              Marked present today
            </span>
          </div>
        </Card>

        <Card
          variant="gradient"
          interactive
          onClick={() => navigate('/attendance')}
          className="flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              {t('home.absentToday')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[var(--expense)]/20 flex items-center justify-center text-[var(--expense)] shadow-2xs">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text-muted)] tracking-tight">
              {absentTodayCount}
            </div>
            <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
              Leaves or absent today
            </span>
          </div>
        </Card>
      </div>

      {/* PHASE 3 FINANCIAL KPI METRICS (Hidden from Supervisor) */}
      {!isSupervisor && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          <Card
            variant="surface"
            interactive
            onClick={() => navigate('/payments')}
            className="p-3.5 border border-[var(--border)] flex flex-col justify-between"
          >
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
              Payable This Month
            </span>
            <div className="mt-1">
              {renderAmount(monthTotalPayable, 'text-xl sm:text-2xl font-black text-[var(--income)]')}
            </div>
            <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
              Net balance due to pay
            </span>
          </Card>

          <Card
            variant="surface"
            interactive
            onClick={() => navigate('/payments')}
            className="p-3.5 border border-[var(--border)] flex flex-col justify-between"
          >
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
              Salary Paid This Month
            </span>
            <div className="mt-1">
              {renderAmount(monthTotalPaid, 'text-xl sm:text-2xl font-black text-[var(--text)]')}
            </div>
            <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
              Disbursed in current period
            </span>
          </Card>

          <Card
            variant="surface"
            interactive
            onClick={() => navigate('/payments')}
            className="p-3.5 border border-[var(--border)] flex flex-col justify-between col-span-2 sm:col-span-1"
          >
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
              Advances Outstanding
            </span>
            <div className="mt-1">
              {renderAmount(totalAdvancesOutstanding, 'text-xl sm:text-2xl font-black text-amber-400')}
            </div>
            <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
              Recoverable peshgi / udhar
            </span>
          </Card>
        </div>
      )}

      {/* Primary Big Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setIsStaffModalOpen(true)}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] transition duration-150 active:scale-97 cursor-pointer text-center group shadow-xs"
        >
          <div className="w-11 h-11 rounded-2xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition">
            <UserPlus className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-[var(--text)]">
            {t('home.actionAddStaff')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/attendance')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] transition duration-150 active:scale-97 cursor-pointer text-center group shadow-xs"
        >
          <div className="w-11 h-11 rounded-2xl bg-[var(--btn-income)] text-white flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-[var(--text)]">
            {t('home.actionAttendance')}
          </span>
        </button>

        {/* Phase 3 Make Payment Action */}
        {!isSupervisor ? (
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] transition duration-150 active:scale-97 cursor-pointer text-center group shadow-xs"
          >
            <div className="w-11 h-11 rounded-2xl bg-[var(--btn-expense)] text-white flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-[var(--text)]">
              {t('home.actionPayment')}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsWorkModalOpen(true)}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] transition duration-150 active:scale-97 cursor-pointer text-center group shadow-xs"
          >
            <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-[var(--text)]">
              Log Daily Work
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] transition duration-150 active:scale-97 cursor-pointer text-center group shadow-xs"
        >
          <div className="w-11 h-11 rounded-2xl bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition">
            <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-[var(--text)]">
            {t('home.actionReports')}
          </span>
        </button>
      </div>

      {/* PHASE 3 LABOUR COST BREAKDOWNS (Hidden from Supervisor) */}
      {!isSupervisor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          {/* Labour Cost By Site */}
          <Card variant="surface" className="p-4 border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="font-bold text-xs sm:text-sm text-[var(--text)]">Cost by Site / Shop</h3>
              </div>
            </div>

            {costBySite.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">No site cost entries yet</p>
            ) : (
              <div className="space-y-2.5">
                {costBySite.map((s, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--text)] truncate">{s.name}</span>
                      {renderAmount(s.amount, 'text-[var(--income)]')}
                    </div>
                    <div className="w-full bg-[var(--surface-2)] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[var(--accent)] h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.round((s.amount / (monthTotalPayable || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Labour Cost By Role */}
          <Card variant="surface" className="p-4 border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-xs sm:text-sm text-[var(--text)]">Cost by Role</h3>
              </div>
            </div>

            {costByRole.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">No role cost entries yet</p>
            ) : (
              <div className="space-y-2.5">
                {costByRole.map((r, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--text)] truncate">{r.name}</span>
                      {renderAmount(r.amount, 'text-[var(--income)]')}
                    </div>
                    <div className="w-full bg-[var(--surface-2)] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.round((r.amount / (monthTotalPayable || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Monthly Payout Trend Chart */}
          <Card variant="surface" className="p-4 border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--income)]" />
                <h3 className="font-bold text-xs sm:text-sm text-[var(--text)]">Monthly Payout Trend</h3>
              </div>
            </div>

            <div className="flex items-end justify-between gap-2 h-28 pt-2 px-1">
              {monthlyTrend.map((item, idx) => {
                const heightPct = Math.max(12, Math.round((item.amount / maxTrendAmount) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[9px] font-mono text-[var(--text-muted)] truncate">
                      {isPrivacyMasked ? '••••' : item.amount > 0 ? `₹${item.amount}` : '0'}
                    </span>
                    <div
                      className="w-full max-w-[28px] rounded-t-lg bg-[var(--income)]/80 hover:bg-[var(--income)] transition-all"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] font-semibold text-[var(--text-muted)] truncate">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Quick Sites & Work Types Management Shortcuts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setIsSitesModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-semibold hover:bg-[var(--surface)] transition whitespace-nowrap cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Manage Sites / Shops</span>
        </button>

        <button
          type="button"
          onClick={() => setIsWorkTypesModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-semibold hover:bg-[var(--surface)] transition whitespace-nowrap cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Manage Work Types</span>
        </button>

        <button
          type="button"
          onClick={() => setIsWorkModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-semibold hover:bg-[var(--surface)] transition whitespace-nowrap cursor-pointer"
        >
          <Briefcase className="w-3.5 h-3.5 text-purple-400" />
          <span>Log Daily Work</span>
        </button>
      </div>

      {/* Today's Quick Attendance Shortcut */}
      {staffPreviewList.length > 0 && (
        <Card variant="surface" className="border border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[var(--income)]" />
              <h3 className="font-bold text-sm text-[var(--text)]">Today's Attendance Shortcut</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/attendance')}
              className="text-xs text-[var(--accent)] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {staffPreviewList.map((staff) => {
              const currentStatus = todayAttendanceMap[staff.id]?.status;
              return (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border)]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={staff.name} src={staff.photo_path || undefined} size="sm" />
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-[var(--text)] block truncate">
                        {staff.name}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] block truncate">
                        {staff.role_title || 'Worker'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuickMark(staff.id, 'present')}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                        currentStatus === 'present'
                          ? 'bg-[var(--btn-income)] text-white'
                          : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--income)]'
                      }`}
                    >
                      P
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickMark(staff.id, 'half')}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                        currentStatus === 'half'
                          ? 'bg-[var(--warning)] text-black'
                          : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--warning)]'
                      }`}
                    >
                      H
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickMark(staff.id, 'absent')}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                        currentStatus === 'absent'
                          ? 'bg-[var(--btn-expense)] text-white'
                          : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--expense)]'
                      }`}
                    >
                      A
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 3-Step Quick Start Onboarding Guide */}
      <Card variant="surface" className="border border-[var(--border)]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="font-bold text-sm sm:text-base text-[var(--text)]">
            {t('home.onboardingTitle')}
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-2)]/60">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              1
            </div>
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-[var(--text)] font-medium leading-relaxed">
                {t('home.onboardingStep1')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-2)]/60">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              2
            </div>
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-[var(--text)] font-medium leading-relaxed">
                {t('home.onboardingStep2')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-2)]/60">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              3
            </div>
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-[var(--text)] font-medium leading-relaxed">
                {t('home.onboardingStep3')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Modals */}
      {isStaffModalOpen && (
        <StaffFormModal
          isOpen={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
          onSaved={() => loadDashboardData()}
        />
      )}

      {isWorkModalOpen && (
        <WorkEntryModal
          isOpen={isWorkModalOpen}
          onClose={() => setIsWorkModalOpen(false)}
          onSaved={() => loadDashboardData()}
        />
      )}

      {isSitesModalOpen && (
        <SitesModal
          isOpen={isSitesModalOpen}
          onClose={() => setIsSitesModalOpen(false)}
          onUpdated={() => loadDashboardData()}
        />
      )}

      {isWorkTypesModalOpen && (
        <WorkTypesModal
          isOpen={isWorkTypesModalOpen}
          onClose={() => setIsWorkTypesModalOpen(false)}
          onUpdated={() => loadDashboardData()}
        />
      )}

      {isPaymentModalOpen && (
        <PaymentFormModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => loadDashboardData()}
        />
      )}
    </div>
  );
};
