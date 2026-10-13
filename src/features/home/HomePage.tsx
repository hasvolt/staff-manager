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
import { DailyKhataIntegrationCard } from './DailyKhataIntegrationCard';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useOrg } from '@/features/org/orgContext';
import { useAuth } from '@/features/auth/authContext';
import { useToast } from '@/components/ui/Toast';
import { localDb, LocalStaff, LocalAttendanceEntry, LocalPayment, LocalSite } from '@/lib/db/dexie';
import { attendanceRepo } from '@/lib/db/repository';
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
  TrendingUp,
  FileText,
  Clock,
  HelpCircle,
  Check,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const { t, formatCurrency } = useI18n();
  const { currentOrg, role } = useOrg();
  const { isLocalMode } = useAuth();
  const { success, error, info } = useToast();
  const navigate = useNavigate();

  const advancedCalcUrl =
    import.meta.env.VITE_ADVANCED_CALCULATOR_URL || 'https://www.rozfiber.com/calculator';

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
  const [, setSitesList] = useState<LocalSite[]>([]);
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
  const [isHelpGuideOpen, setIsHelpGuideOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

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
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      for (let i = 3; i >= 0; i--) {
        const d = new Date(curYear, curMonth - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const mStart = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const mEnd = `${y}-${String(m + 1).padStart(2, '0')}-${String(getDaysInMonth(y, m)).padStart(2, '0')}`;

        const mPaid = payments
          .filter(
            (p) => !p.deleted_at && p.pay_date >= mStart && p.pay_date <= mEnd && p.type === 'salary'
          )
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

  // 1-Tap Bulk Action: Mark All Present
  const handleMarkAllPresent = async () => {
    if (!currentOrg || allActiveStaff.length === 0) return;
    setIsMarkingAll(true);
    try {
      for (const staff of allActiveStaff) {
        const existing = todayAttendanceMap[staff.id];
        if (existing) {
          if (existing.status !== 'present') {
            await attendanceRepo.update(existing.id, {
              status: 'present',
              updated_at: new Date().toISOString(),
            });
          }
        } else {
          await attendanceRepo.create({
            org_id: currentOrg.id,
            staff_id: staff.id,
            work_date: todayStr,
            status: 'present',
            overtime_hours: 0,
          });
        }
      }
      success(`All ${allActiveStaff.length} staff marked Present for today!`);
      await loadDashboardData();
    } catch {
      error('Error marking all staff present');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const isSupervisor = role === 'supervisor';
  const unmarkedTodayCount = Math.max(
    0,
    activeStaffCount - (presentTodayCount + absentTodayCount)
  );

  const maxTrendAmount = useMemo(() => {
    const max = Math.max(...monthlyTrend.map((t) => t.amount), 1);
    return max;
  }, [monthlyTrend]);

  const maxSiteCost = useMemo(() => {
    return Math.max(...costBySite.map((s) => s.amount), 1);
  }, [costBySite]);

  const maxRoleCost = useMemo(() => {
    return Math.max(...costByRole.map((r) => r.amount), 1);
  }, [costByRole]);

  // Onboarding 3-step progress checks
  const step1Done = activeStaffCount > 0;
  const step2Done = presentTodayCount + absentTodayCount > 0;
  const step3Done = allPayments.length > 0;
  const completedStepsCount =
    (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0);

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in text-left pb-12">
      {/* 1. Header Bar: Business Info, Privacy Mask & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface-2)]/50 p-3.5 sm:p-4 rounded-2xl border border-[var(--border)] shadow-2xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-[var(--text)] truncate">
              {currentOrg?.name || t('home.title')}
            </h1>
            {!isSupervisor && (
              <button
                type="button"
                onClick={togglePrivacyMask}
                title={isPrivacyMasked ? 'Reveal amounts' : 'Mask amounts for privacy'}
                className="p-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] transition duration-150 active:scale-95 cursor-pointer shadow-2xs shrink-0"
                aria-label="Toggle Privacy Mask"
              >
                {isPrivacyMasked ? (
                  <EyeOff className="w-4 h-4 text-amber-400" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 font-medium truncate">
            {t('tagline')} &bull; <span className="text-[var(--text)] font-semibold">{todayStr}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {advancedCalcUrl && (
            <a
              href={advancedCalcUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs font-semibold hover:border-[var(--accent)] transition duration-150 active:scale-95 cursor-pointer shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span>{t('calc.advanced')}</span>
            </a>
          )}

          <Badge variant="accent" className="text-xs">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{isLocalMode ? 'Local Mode' : 'Cloud Sync Active'}</span>
          </Badge>

          <button
            type="button"
            onClick={async () => {
              info('Syncing changes with cloud...');
              const res = await syncEngine.syncNow(currentOrg?.id);
              if (res.success) success('Synced successfully!');
              else error(res.message);
              loadDashboardData();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs font-semibold hover:border-[var(--accent)] transition duration-150 active:scale-95 cursor-pointer shadow-2xs"
            title="Manual sync with cloud"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (Modern, High Contrast, Responsive) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Total Staff */}
        <Card
          variant="gradient"
          interactive
          onClick={() => navigate('/staff')}
          className="group flex flex-col justify-between p-3.5 sm:p-4.5 border border-[var(--border)] hover:border-[var(--accent)] shadow-xs hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text)] block truncate">
                {t('home.totalStaff')}
              </span>
              <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] font-medium block truncate">
                कुल स्टाफ
              </span>
            </div>
            <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shadow-2xs group-hover:scale-105 transition-transform shrink-0">
              <Users className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[var(--text)] tracking-tight truncate">
              {activeStaffCount}
            </div>
            <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] mt-0.5 block truncate">
              Enrolled active members
            </span>
          </div>
        </Card>

        {/* Card 2: Present Today */}
        <Card
          variant="gradient"
          interactive
          onClick={() => navigate('/attendance')}
          className="group flex flex-col justify-between p-3.5 sm:p-4.5 border border-[var(--border)] hover:border-[var(--income)] shadow-xs hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text)] block truncate">
                {t('home.presentToday')}
              </span>
              <span className="text-[10px] sm:text-[11px] text-[var(--income)] font-bold block truncate">
                आज उपस्थित
              </span>
            </div>
            <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[var(--income)]/20 border border-[var(--income)]/30 flex items-center justify-center text-[var(--income)] shadow-2xs group-hover:scale-105 transition-transform shrink-0">
              <CheckCircle2 className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[var(--income)] tracking-tight truncate">
              {presentTodayCount}
            </div>
            <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] mt-0.5 block truncate">
              {activeStaffCount > 0
                ? `${Math.round((presentTodayCount / activeStaffCount) * 100)}% attendance today`
                : 'No staff yet'}
            </span>
          </div>
        </Card>

        {/* Card 3: Unmarked / Absent Today */}
        <Card
          variant="gradient"
          interactive
          onClick={() => navigate('/attendance')}
          className="group flex flex-col justify-between p-3.5 sm:p-4.5 border border-[var(--border)] hover:border-[var(--expense)] shadow-xs hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text)] block truncate">
                Unmarked / Absent
              </span>
              <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] font-medium block truncate">
                बाकी / गैरहाजिर
              </span>
            </div>
            <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[var(--expense)]/20 border border-[var(--expense)]/30 flex items-center justify-center text-[var(--expense)] shadow-2xs group-hover:scale-105 transition-transform shrink-0">
              <Clock className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[var(--text)] tracking-tight truncate">
              {unmarkedTodayCount > 0 ? (
                <span className="text-amber-400">{unmarkedTodayCount} pending</span>
              ) : (
                <span className="text-[var(--text-muted)]">{absentTodayCount} absent</span>
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] mt-0.5 block truncate">
              {unmarkedTodayCount > 0 ? 'Needs today attendance' : 'All marked today'}
            </span>
          </div>
        </Card>

        {/* Card 4: Net Payable Balance (Hidden from Supervisor) */}
        {!isSupervisor ? (
          <Card
            variant="gradient"
            interactive
            onClick={() => navigate('/payments')}
            className="group flex flex-col justify-between p-3.5 sm:p-4.5 border border-[var(--border)] hover:border-[var(--accent)] shadow-xs hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text)] block truncate">
                  Payable This Month
                </span>
                <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] font-medium block truncate">
                  इस माह कुल बकाया
                </span>
              </div>
              <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--income)] shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                <CreditCard className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-black text-[var(--income)] tracking-tight truncate">
                {renderAmount(monthTotalPayable)}
              </div>
              <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] mt-0.5 block truncate">
                Net dues for current cycle
              </span>
            </div>
          </Card>
        ) : (
          <Card
            variant="gradient"
            interactive
            onClick={() => setIsWorkModalOpen(true)}
            className="group flex flex-col justify-between p-3.5 sm:p-4.5 border border-[var(--border)] hover:border-[var(--accent)] shadow-xs hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text)] block truncate">
                  Daily Work Log
                </span>
                <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] font-medium block truncate">
                  दैनिक कार्य दर्ज
                </span>
              </div>
              <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                <Briefcase className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--text)] tracking-tight truncate">
                Log Work
              </div>
              <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] mt-0.5 block truncate">
                Units, sites & daily tasks
              </span>
            </div>
          </Card>
        )}
      </div>

      {/* 3. Action-First Tactile Dashboard: 4 Big Primary Action Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm sm:text-base font-bold text-[var(--text)] flex items-center gap-2">
            <span>Primary Quick Actions</span>
            <span className="text-xs font-normal text-[var(--text-muted)] hidden sm:inline">
              (त्वरित कार्य - एक क्लिक में शुरू करें)
            </span>
          </h2>
          <button
            type="button"
            onClick={() => setIsHelpGuideOpen(true)}
            className="text-xs text-[var(--accent)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How it works</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          {/* Action 1: Mark Attendance */}
          <button
            type="button"
            onClick={() => navigate('/attendance')}
            className="group flex flex-col justify-between p-4.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--income)] hover:bg-[var(--surface-2)] transition-all duration-200 active:scale-[0.98] active:brightness-95 cursor-pointer text-left shadow-xs hover:shadow-md relative overflow-hidden h-full"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-11 h-11 rounded-xl bg-[var(--btn-income)] text-white flex items-center justify-center shadow-md shadow-emerald-600/25 group-hover:scale-105 transition-transform shrink-0">
                <CalendarCheck className="w-5.5 h-5.5" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--income)] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                Daily Attendance
              </span>
            </div>
            <div className="mt-3.5">
              <h3 className="font-bold text-base text-[var(--text)] group-hover:text-[var(--income)] transition-colors">
                {t('home.actionAttendance')}
              </h3>
              <p className="text-xs font-semibold text-[var(--income)] mt-0.5">
                हाजिरी लगाएं (1-Tap Mark)
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Present, Absent, Half-day and Overtime tracking.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-[var(--border)]/70 flex items-center justify-between text-xs font-semibold text-[var(--income)]">
              <span>Mark Today</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Action 2: Make Payment / Advances */}
          {!isSupervisor ? (
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="group flex flex-col justify-between p-4.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--btn-expense)] hover:bg-[var(--surface-2)] transition-all duration-200 active:scale-[0.98] active:brightness-95 cursor-pointer text-left shadow-xs hover:shadow-md relative overflow-hidden h-full"
            >
              <div className="flex items-start justify-between w-full">
                <div className="w-11 h-11 rounded-xl bg-[var(--btn-expense)] text-white flex items-center justify-center shadow-md shadow-rose-600/25 group-hover:scale-105 transition-transform shrink-0">
                  <CreditCard className="w-5.5 h-5.5" />
                </div>
                <span className="text-[11px] font-semibold text-[var(--expense)] bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg">
                  Salary & Udhar
                </span>
              </div>
              <div className="mt-3.5">
                <h3 className="font-bold text-base text-[var(--text)] group-hover:text-[var(--expense)] transition-colors">
                  {t('home.actionPayment')}
                </h3>
                <p className="text-xs font-semibold text-[var(--expense)] mt-0.5">
                  वेतन व उधार/पेशगी दर्ज करें
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Salary payout, advance (udhar), bonus & deductions.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-[var(--border)]/70 flex items-center justify-between text-xs font-semibold text-[var(--expense)]">
                <span>Record Payout</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsWorkModalOpen(true)}
              className="group flex flex-col justify-between p-4.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-purple-500 hover:bg-[var(--surface-2)] transition-all duration-200 active:scale-[0.98] active:brightness-95 cursor-pointer text-left shadow-xs hover:shadow-md relative overflow-hidden h-full"
            >
              <div className="flex items-start justify-between w-full">
                <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/25 group-hover:scale-105 transition-transform shrink-0">
                  <Briefcase className="w-5.5 h-5.5" />
                </div>
                <span className="text-[11px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-lg">
                  Daily Work
                </span>
              </div>
              <div className="mt-3.5">
                <h3 className="font-bold text-base text-[var(--text)] group-hover:text-purple-400 transition-colors">
                  Log Daily Work
                </h3>
                <p className="text-xs font-semibold text-purple-400 mt-0.5">
                  दैनिक कार्य व यूनिट दर्ज करें
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Work descriptions, project sites, units and pieces.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-[var(--border)]/70 flex items-center justify-between text-xs font-semibold text-purple-400">
                <span>Enter Work</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )}

          {/* Action 3: Add New Staff */}
          <button
            type="button"
            onClick={() => setIsStaffModalOpen(true)}
            className="group flex flex-col justify-between p-4.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-2)] transition-all duration-200 active:scale-[0.98] active:brightness-95 cursor-pointer text-left shadow-xs hover:shadow-md relative overflow-hidden h-full"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-11 h-11 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center shadow-md shadow-[var(--accent)]/25 group-hover:scale-105 transition-transform shrink-0">
                <UserPlus className="w-5.5 h-5.5" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2 py-0.5 rounded-lg">
                Staff Directory
              </span>
            </div>
            <div className="mt-3.5">
              <h3 className="font-bold text-base text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                {t('home.actionAddStaff')}
              </h3>
              <p className="text-xs font-semibold text-[var(--accent)] mt-0.5">
                नया स्टाफ जोड़ें (Daily/Monthly)
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Add profile, designation, wage rate & weekly off.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-[var(--border)]/70 flex items-center justify-between text-xs font-semibold text-[var(--accent)]">
              <span>Add Member</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Action 4: Statements & Slips */}
          <button
            type="button"
            onClick={() => navigate('/reports')}
            className="group flex flex-col justify-between p-4.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-blue-500 hover:bg-[var(--surface-2)] transition-all duration-200 active:scale-[0.98] active:brightness-95 cursor-pointer text-left shadow-xs hover:shadow-md relative overflow-hidden h-full"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform shrink-0">
                <FileText className="w-5.5 h-5.5" />
              </div>
              <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-lg">
                Slips & Reports
              </span>
            </div>
            <div className="mt-3.5">
              <h3 className="font-bold text-base text-[var(--text)] group-hover:text-blue-400 transition-colors">
                {t('home.actionReports')}
              </h3>
              <p className="text-xs font-semibold text-blue-400 mt-0.5">
                सैलरी स्लिप व लेजर हिसाब
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Print salary slip, attendance register & export CSV.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-[var(--border)]/70 flex items-center justify-between text-xs font-semibold text-blue-400">
              <span>View Statements</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* 4. Interactive 3-Step Quick Guide Card (इन्टरेक्टिव 3-स्टेप गाइड) */}
      <Card
        variant="surface"
        className="p-4 sm:p-5 border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[var(--text)] flex items-center gap-2">
                <span>{t('home.onboardingTitle')}</span>
                <span className="text-xs font-normal text-[var(--text-muted)] hidden sm:inline">
                  (आसान 3-स्टेप मार्गदर्शिका)
                </span>
              </h3>
              <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                {completedStepsCount === 3
                  ? 'All initial steps completed! Your business is active.'
                  : `${completedStepsCount} of 3 steps completed. Follow these steps to get started.`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]">
              {completedStepsCount} / 3 Complete
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsHelpGuideOpen(true)}
              className="text-xs"
            >
              <HelpCircle className="w-3.5 h-3.5 mr-1 text-[var(--accent)]" />
              <span>Full Guide</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Step 1 */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
              step1Done
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : 'bg-[var(--surface-2)]/70 border-[var(--accent)]/40 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Step 1
                </span>
                {step1Done ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--income)] bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                    <Check className="w-3 h-3" />
                    <span>Done ({activeStaffCount})</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/15 border border-[var(--accent)]/30 px-2 py-0.5 rounded-lg">
                    Action Needed
                  </span>
                )}
              </div>
              <h4 className="font-bold text-sm text-[var(--text)]">
                Add Staff & Wage Rates
              </h4>
              <p className="text-xs font-semibold text-[var(--accent)] mt-0.5">
                स्टाफ जोड़ें और वेतन तय करें
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Add name, designation & wage type (Daily, Monthly, Hourly, Per-piece).
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-[var(--border)] flex justify-between items-center">
              <Button
                variant={step1Done ? 'secondary' : 'primary'}
                size="sm"
                fullWidth
                onClick={() => setIsStaffModalOpen(true)}
              >
                {step1Done ? '+ Add More Staff' : '+ Add First Staff'}
              </Button>
            </div>
          </div>

          {/* Step 2 */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
              step2Done
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : step1Done
                ? 'bg-[var(--surface-2)]/70 border-[var(--income)]/40 shadow-xs'
                : 'bg-[var(--surface-2)]/40 border-[var(--border)] opacity-85'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Step 2
                </span>
                {step2Done ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--income)] bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                    <Check className="w-3 h-3" />
                    <span>Marked Today</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 rounded-lg">
                    Daily Attendance
                  </span>
                )}
              </div>
              <h4 className="font-bold text-sm text-[var(--text)]">
                Mark Daily Attendance
              </h4>
              <p className="text-xs font-semibold text-[var(--income)] mt-0.5">
                दैनिक हाजिरी लगाएं
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                1-tap: Present (उपस्थित), Half-day (आधा दिन), Absent (छुट्टी).
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-[var(--border)] flex justify-between items-center">
              <Button
                variant={step2Done ? 'secondary' : 'income'}
                size="sm"
                fullWidth
                onClick={() => navigate('/attendance')}
              >
                {step2Done ? 'View Attendance' : 'Mark Attendance Now'}
              </Button>
            </div>
          </div>

          {/* Step 3 */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
              step3Done
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : 'bg-[var(--surface-2)]/50 border-[var(--border)]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Step 3
                </span>
                {step3Done ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--income)] bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                    <Check className="w-3 h-3" />
                    <span>Records Active</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 rounded-lg">
                    Payouts & Slips
                  </span>
                )}
              </div>
              <h4 className="font-bold text-sm text-[var(--text)]">
                Advances & Salary Slips
              </h4>
              <p className="text-xs font-semibold text-rose-400 mt-0.5">
                वेतन/उधार दर्ज करें व स्लिप बनाएं
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Record advance (peshgi), month settlement & download PDF slips.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-[var(--border)] flex justify-between items-center">
              <Button
                variant={step3Done ? 'secondary' : 'outline'}
                size="sm"
                fullWidth
                onClick={() => {
                  if (!isSupervisor) setIsPaymentModalOpen(true);
                  else navigate('/reports');
                }}
              >
                {!isSupervisor ? 'Record Payment' : 'View Reports'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 5. Today's Quick Attendance Widget with 1-Tap "Mark All Present" */}
      {staffPreviewList.length > 0 && (
        <Card variant="surface" className="p-4 sm:p-5 border border-[var(--border)] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[var(--income)]/20 border border-[var(--income)]/30 flex items-center justify-center text-[var(--income)] shadow-2xs shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm sm:text-base text-[var(--text)] truncate">
                  Today's Attendance Shortcut
                </h3>
                <span className="text-xs text-[var(--text-muted)] block truncate mt-0.5">
                  {todayStr} &bull; {presentTodayCount} marked present &bull;{' '}
                  {unmarkedTodayCount} pending
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="income"
                size="sm"
                onClick={handleMarkAllPresent}
                isLoading={isMarkingAll}
                className="text-xs shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />
                <span>Mark All Present</span>
              </Button>

              <button
                type="button"
                onClick={() => navigate('/attendance')}
                className="text-xs text-[var(--accent)] font-semibold hover:underline flex items-center gap-1 cursor-pointer px-2 py-1"
              >
                <span>Full Register</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {staffPreviewList.map((staff) => {
              const currentStatus = todayAttendanceMap[staff.id]?.status;
              return (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] hover:border-[var(--accent)]/40 transition shadow-2xs min-w-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <Avatar name={staff.name} src={staff.photo_path || undefined} size="sm" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs sm:text-sm text-[var(--text)] block truncate">
                        {staff.name}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] block truncate font-medium">
                        {staff.role_title || 'Worker'} &bull;{' '}
                        {staff.payment_type === 'daily'
                          ? 'Daily'
                          : staff.payment_type === 'monthly'
                          ? 'Monthly'
                          : 'Per unit'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuickMark(staff.id, 'present')}
                      title="Mark Present (उपस्थित)"
                      aria-label={`Mark ${staff.name} Present`}
                      className={`w-9 h-9 sm:w-9 sm:h-9 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90 cursor-pointer flex items-center justify-center border ${
                        currentStatus === 'present'
                          ? 'bg-[var(--btn-income)] text-white border-[var(--btn-income)] shadow-sm'
                          : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--income)] hover:text-[var(--income)]'
                      }`}
                    >
                      P
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickMark(staff.id, 'half')}
                      title="Mark Half-Day (आधा दिन)"
                      aria-label={`Mark ${staff.name} Half-Day`}
                      className={`w-9 h-9 sm:w-9 sm:h-9 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90 cursor-pointer flex items-center justify-center border ${
                        currentStatus === 'half'
                          ? 'bg-[var(--warning)] text-black border-[var(--warning)] shadow-sm font-extrabold'
                          : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--warning)] hover:text-[var(--warning)]'
                      }`}
                    >
                      H
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickMark(staff.id, 'absent')}
                      title="Mark Absent (गैरहाजिर)"
                      aria-label={`Mark ${staff.name} Absent`}
                      className={`w-9 h-9 sm:w-9 sm:h-9 rounded-xl text-xs font-bold transition-all duration-150 active:scale-90 cursor-pointer flex items-center justify-center border ${
                        currentStatus === 'absent'
                          ? 'bg-[var(--btn-expense)] text-white border-[var(--btn-expense)] shadow-sm'
                          : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--expense)] hover:text-[var(--expense)]'
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

      {/* 6. Quick Sites & Work Types Management Shortcuts (Fixed: Responsive Grid, Zero Horizontal Blowout) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => setIsSitesModalOpen(true)}
          className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] hover:border-[var(--accent)] transition-all duration-150 active:scale-[0.98] text-left cursor-pointer shadow-2xs group"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] group-hover:bg-[var(--accent)]/15 border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0 transition-colors">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-bold text-xs sm:text-sm text-[var(--text)] block truncate">
              Manage Sites / Shops
            </span>
            <span className="text-[11px] text-[var(--text-muted)] block truncate mt-0.5">
              साइट्स व दुकानें प्रबंधित करें
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => setIsWorkTypesModalOpen(true)}
          className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] hover:border-[var(--accent)] transition-all duration-150 active:scale-[0.98] text-left cursor-pointer shadow-2xs group"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] group-hover:bg-[var(--accent)]/15 border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shrink-0 transition-colors">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-bold text-xs sm:text-sm text-[var(--text)] block truncate">
              Manage Work Types
            </span>
            <span className="text-[11px] text-[var(--text-muted)] block truncate mt-0.5">
              कार्य प्रकार व यूनिट दरें
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => setIsWorkModalOpen(true)}
          className="flex items-center gap-3 p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] hover:border-purple-400 transition-all duration-150 active:scale-[0.98] text-left cursor-pointer shadow-2xs group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 transition-colors">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-bold text-xs sm:text-sm text-[var(--text)] block truncate">
              Log Daily Work
            </span>
            <span className="text-[11px] text-[var(--text-muted)] block truncate mt-0.5">
              दैनिक कार्य व यूनिट दर्ज करें
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
      </div>

      {/* 7. Labour Cost Breakdowns & Trend Charts (Hidden from Supervisor) */}
      {!isSupervisor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          {/* Labour Cost By Site */}
          <Card variant="surface" className="p-4 border border-[var(--border)] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <h3 className="font-bold text-xs sm:text-sm text-[var(--text)]">
                  Cost by Site / Shop
                </h3>
              </div>
            </div>

            {costBySite.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                No site cost entries yet
              </p>
            ) : (
              <div className="space-y-2.5">
                {costBySite.map((s, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--text)] truncate">{s.name}</span>
                      {renderAmount(s.amount, 'text-[var(--income)] font-bold')}
                    </div>
                    <div className="w-full bg-[var(--surface-2)] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[var(--accent)] h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((s.amount / maxSiteCost) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Labour Cost By Role */}
          <Card variant="surface" className="p-4 border border-[var(--border)] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-400 shrink-0" />
                <h3 className="font-bold text-xs sm:text-sm text-[var(--text)]">Cost by Role</h3>
              </div>
            </div>

            {costByRole.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                No role cost entries yet
              </p>
            ) : (
              <div className="space-y-2.5">
                {costByRole.map((r, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--text)] truncate">{r.name}</span>
                      {renderAmount(r.amount, 'text-[var(--income)] font-bold')}
                    </div>
                    <div className="w-full bg-[var(--surface-2)] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((r.amount / maxRoleCost) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Monthly Payout Trend Chart */}
          <Card variant="surface" className="p-4 border border-[var(--border)] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--income)] shrink-0" />
                <h3 className="font-bold text-xs sm:text-sm text-[var(--text)]">
                  Monthly Payout Trend
                </h3>
              </div>
            </div>

            <div className="flex items-end justify-between gap-2 h-28 pt-2 px-1">
              {monthlyTrend.map((item, idx) => {
                const heightPct = Math.max(14, Math.round((item.amount / maxTrendAmount) * 100));
                return (
                  <div
                    key={idx}
                    className="flex-1 min-w-0 flex flex-col items-center gap-1.5 h-full justify-end"
                  >
                    <span className="text-[9px] font-mono text-[var(--text-muted)] truncate block w-full text-center">
                      {isPrivacyMasked ? '••••' : item.amount > 0 ? `₹${item.amount}` : '0'}
                    </span>
                    <div
                      className="w-full max-w-[28px] rounded-t-lg bg-[var(--income)]/80 hover:bg-[var(--income)] transition-all"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] font-semibold text-[var(--text-muted)] truncate block w-full text-center">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* 8. Daily Khata Pro Sister Product & Calculators Integration Card */}
      <DailyKhataIntegrationCard />

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

      {/* How Staff Manager Works - Visual Help Modal */}
      {isHelpGuideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          onClick={() => setIsHelpGuideOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center font-bold">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text)]">
                    How Staff Manager Works
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">
                    स्टाफ मैनेजर का सरल उपयोग मार्गदर्शक
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpGuideOpen(false)}
                className="p-1.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-[var(--text)]">
              <div className="p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[var(--accent)] text-sm">
                  <span>1. Staff Profiles (स्टाफ प्रोफाइल)</span>
                </div>
                <p className="text-[var(--text-muted)]">
                  Add staff once with their wage rate. Supported types: <strong>Daily Wage</strong> (दैनिक मजदूरी), <strong>Monthly Salary</strong> (मासिक वेतन), <strong>Hourly</strong>, and <strong>Per-Piece</strong> (प्रति यूनिट).
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[var(--income)] text-sm">
                  <span>2. 10-Second Daily Attendance (दैनिक हाजिरी)</span>
                </div>
                <p className="text-[var(--text-muted)]">
                  Mark <strong>Present</strong> (P), <strong>Half-day</strong> (H), or <strong>Absent</strong> (A). Use "Mark All Present" to record your whole team with 1 tap, then only change exceptions!
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-400 text-sm">
                  <span>3. Payments & Advances / Udhar (वेतन व पेशगी)</span>
                </div>
                <p className="text-[var(--text-muted)]">
                  Record advance (उधार/पेशगी), salary payments, and bonus. Staff ledger automatically calculates earned vs paid dues without mathematical errors.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-400 text-sm">
                  <span>4. Professional Salary Slips & Offline (स्लिप व सुरक्षा)</span>
                </div>
                <p className="text-[var(--text-muted)]">
                  Generate printable salary slips and download Excel/CSV anytime. The app works 100% offline; changes sync automatically whenever internet connects.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                fullWidth
                onClick={() => setIsHelpGuideOpen(false)}
              >
                Got It! (समझ गया)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
