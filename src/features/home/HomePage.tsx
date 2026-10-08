import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { NumberInput } from '@/components/ui/NumberInput';
import { FormField } from '@/components/ui/FormField';
import { StaffFormModal } from '@/features/staff/StaffFormModal';
import { WorkEntryModal } from '@/features/work/WorkEntryModal';
import { SitesModal } from '@/features/work/SitesModal';
import { WorkTypesModal } from '@/features/work/WorkTypesModal';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useOrg } from '@/features/org/orgContext';
import { useAuth } from '@/features/auth/authContext';
import { useCalculator } from '@/features/calculator/calculatorContext';
import { useToast } from '@/components/ui/Toast';
import { localDb, LocalStaff, LocalAttendanceEntry } from '@/lib/db/dexie';
import { attendanceRepo, staffRepo } from '@/lib/db/repository';
import { syncEngine } from '@/lib/sync/syncEngine';
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
  Calculator,
  ShieldCheck,
  RefreshCw,
  MapPin,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const { t, formatCurrency } = useI18n();
  const { currentOrg, role } = useOrg();
  const { isLocalMode } = useAuth();
  const { openCalculator } = useCalculator();
  const { success, error, info } = useToast();
  const navigate = useNavigate();

  const [activeStaffCount, setActiveStaffCount] = useState(0);
  const [presentTodayCount, setPresentTodayCount] = useState(0);
  const [absentTodayCount, setAbsentTodayCount] = useState(0);
  const [staffPreviewList, setStaffPreviewList] = useState<LocalStaff[]>([]);
  const [todayAttendanceMap, setTodayAttendanceMap] = useState<Record<string, LocalAttendanceEntry>>({});

  // Modal launchers
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isSitesModalOpen, setIsSitesModalOpen] = useState(false);
  const [isWorkTypesModalOpen, setIsWorkTypesModalOpen] = useState(false);

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
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentOrg]);

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

  return (
    <div className="space-y-6 animate-in fade-in text-left">
      {/* Welcome & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
            {currentOrg?.name || t('home.title')}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            {t('tagline')}
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Summary KPI Cards */}
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

        {/* Payment button (Hidden from Supervisor) */}
        {!isSupervisor ? (
          <button
            type="button"
            onClick={() => navigate('/payments')}
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
              className="text-xs text-[var(--accent)] font-semibold hover:underline flex items-center gap-1"
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
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
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
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
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
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
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
      <StaffFormModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onSaved={loadDashboardData}
      />
      <WorkEntryModal
        isOpen={isWorkModalOpen}
        onClose={() => setIsWorkModalOpen(false)}
        onSaved={loadDashboardData}
      />
      <SitesModal
        isOpen={isSitesModalOpen}
        onClose={() => setIsSitesModalOpen(false)}
        onUpdated={loadDashboardData}
      />
      <WorkTypesModal
        isOpen={isWorkTypesModalOpen}
        onClose={() => setIsWorkTypesModalOpen(false)}
        onUpdated={loadDashboardData}
      />
    </div>
  );
};
