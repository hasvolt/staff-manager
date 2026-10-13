import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { DatePicker } from '@/components/ui/DatePicker';
import { SearchBox } from '@/components/ui/SearchBox';
import { EmptyState } from '@/components/ui/EmptyState';
import { AttendanceCalendarModal } from './AttendanceCalendarModal';
import { attendanceRepo, staffRepo, siteRepo } from '@/lib/db/repository';
import { localDb, LocalStaff, LocalAttendanceEntry, LocalSite } from '@/lib/db/dexie';
import { isDateInClosedPeriod } from '@/lib/calculations/salaryCalculations';
import { useOrg } from '@/features/org/orgContext';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useToast } from '@/components/ui/Toast';
import {
  CalendarCheck,
  CheckCheck,
  Clock,
  Calendar,
  MessageSquare,
  Users,
  Check,
  Plus,
  Minus,
  Lock,
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { currentOrg } = useOrg();
  const { t, formatDate } = useI18n();
  const { success, error, info } = useToast();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [staffList, setStaffList] = useState<LocalStaff[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, LocalAttendanceEntry>>({});
  const [sites, setSites] = useState<LocalSite[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStaffForCalendar, setSelectedStaffForCalendar] = useState<LocalStaff | null>(null);
  const [isPeriodLocked, setIsPeriodLocked] = useState(false);

  const loadData = async () => {
    if (!currentOrg?.id) return;
    const staff = await staffRepo.list(currentOrg.id, false);
    setStaffList(staff.filter((s) => s.status === 'active'));

    const entries = await localDb.attendance_entries
      .where('org_id')
      .equals(currentOrg.id)
      .filter((a) => !a.deleted_at && a.work_date === selectedDate)
      .toArray();

    const map: Record<string, LocalAttendanceEntry> = {};
    entries.forEach((e) => {
      map[e.staff_id] = e;
    });
    setAttendanceMap(map);

    const siteList = await siteRepo.list(currentOrg.id, false);
    setSites(siteList);

    // Check if period is closed
    const closings = await localDb.period_closings
      .where('org_id')
      .equals(currentOrg.id)
      .filter((c) => !c.deleted_at && c.status === 'closed')
      .toArray();

    const locked = isDateInClosedPeriod(selectedDate, closings);
    setIsPeriodLocked(!!locked);
  };

  useEffect(() => {
    loadData();
  }, [currentOrg, selectedDate]);

  // Daily statistics
  const stats = useMemo(() => {
    let present = 0;
    let half = 0;
    let absent = 0;
    let leave = 0;
    let otHours = 0;

    Object.values(attendanceMap).forEach((a) => {
      if (a.status === 'present') present++;
      else if (a.status === 'half') half++;
      else if (a.status === 'absent') absent++;
      else if (a.status === 'leave_paid' || a.status === 'leave_unpaid') leave++;

      if (a.overtime_hours) otHours += a.overtime_hours;
    });

    return { present, half, absent, leave, otHours };
  }, [attendanceMap]);

  // Set individual staff attendance
  const setStaffStatus = async (
    staffId: string,
    status: 'present' | 'absent' | 'half' | 'leave_paid' | 'leave_unpaid' | 'holiday'
  ) => {
    if (!currentOrg) return;
    if (isPeriodLocked) {
      error('Cannot modify attendance: Selected date belongs to a locked settlement period.');
      return;
    }
    try {
      const existing = attendanceMap[staffId];
      if (existing) {
        const updated = await attendanceRepo.update(existing.id, {
          status,
          updated_at: new Date().toISOString(),
        });
        setAttendanceMap((prev) => ({ ...prev, [staffId]: updated }));
      } else {
        const created = await attendanceRepo.create({
          org_id: currentOrg.id,
          staff_id: staffId,
          work_date: selectedDate,
          status,
          overtime_hours: 0,
        });
        setAttendanceMap((prev) => ({ ...prev, [staffId]: created }));
      }
    } catch {
      error('Failed to update attendance');
    }
  };

  // Adjust overtime
  const adjustOvertime = async (staffId: string, delta: number) => {
    if (!currentOrg) return;
    if (isPeriodLocked) {
      error('Cannot modify overtime: Selected date belongs to a locked settlement period.');
      return;
    }
    try {
      const existing = attendanceMap[staffId];
      if (existing) {
        const newOt = Math.max(0, (existing.overtime_hours || 0) + delta);
        const updated = await attendanceRepo.update(existing.id, { overtime_hours: newOt });
        setAttendanceMap((prev) => ({ ...prev, [staffId]: updated }));
      } else {
        const created = await attendanceRepo.create({
          org_id: currentOrg.id,
          staff_id: staffId,
          work_date: selectedDate,
          status: 'present',
          overtime_hours: Math.max(0, delta),
        });
        setAttendanceMap((prev) => ({ ...prev, [staffId]: created }));
      }
    } catch {
      error('Failed to adjust overtime');
    }
  };

  // Mark all active staff present
  const handleMarkAllPresent = async () => {
    if (!currentOrg || staffList.length === 0) return;
    if (isPeriodLocked) {
      error('Cannot modify attendance: Selected date belongs to a locked settlement period.');
      return;
    }
    try {
      let count = 0;
      for (const s of staffList) {
        const existing = attendanceMap[s.id];
        if (!existing) {
          await attendanceRepo.create({
            org_id: currentOrg.id,
            staff_id: s.id,
            work_date: selectedDate,
            status: 'present',
            overtime_hours: 0,
          });
          count++;
        }
      }
      success(`Marked all ${count} unmarked staff as Present`);
      loadData();
    } catch {
      error('Failed to mark all present');
    }
  };

  const filteredStaff = staffList.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.role_title || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 animate-in fade-in text-left">
      {/* Date Bar & Mark All Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{t('attendance.title')}</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Log 1-tap daily attendance, overtime &amp; exceptions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-40 sm:w-44">
            <DatePicker
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <Button variant="income" size="sm" onClick={handleMarkAllPresent} disabled={isPeriodLocked}>
            <CheckCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Mark All Present</span>
            <span className="sm:hidden">All Present</span>
          </Button>
        </div>
      </div>

      {/* Period Locked Alert Banner */}
      {isPeriodLocked && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-400">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold">
            This date ({selectedDate}) falls inside a closed &amp; locked settlement period. Edits to attendance are disabled.
          </span>
        </div>
      )}

      {/* Daily Stats KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-[var(--income)]/10 border border-[var(--income)]/30 text-center shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--income)] block">
            Present
          </span>
          <span className="text-xl font-black text-[var(--income)]">{stats.present}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--warning)]/10 border border-[var(--warning)]/30 text-center shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--warning)] block">
            Half Day
          </span>
          <span className="text-xl font-black text-[var(--warning)]">{stats.half}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--expense)]/10 border border-[var(--expense)]/30 text-center shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--expense)] block">
            Absent
          </span>
          <span className="text-xl font-black text-[var(--expense)]">{stats.absent}</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-center shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
            Leave
          </span>
          <span className="text-xl font-black text-purple-400">{stats.leave}</span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-center shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] block">
            Total OT Hours
          </span>
          <span className="text-xl font-black text-[var(--text)]">{stats.otHours}h</span>
        </div>
      </div>

      {/* Search Filter */}
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Search staff to mark attendance..."
      />

      {/* Staff Attendance Row List */}
      {filteredStaff.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="No active staff members found"
          description="Go to the Staff section to enroll staff members."
        />
      ) : (
        <div className="space-y-2.5">
          {filteredStaff.map((staff) => {
            const entry = attendanceMap[staff.id];
            const currentStatus = entry?.status;
            const otHours = entry?.overtime_hours || 0;

            return (
              <div
                key={staff.id}
                className="p-3.5 sm:p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Staff Info & Monthly Calendar Shortcut */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={staff.name} src={staff.photo_path || undefined} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[var(--text)] truncate">
                        {staff.name}
                      </span>
                      {currentStatus && (
                        <Badge
                          variant={
                            currentStatus === 'present'
                              ? 'income'
                              : currentStatus === 'half'
                              ? 'warning'
                              : currentStatus === 'absent'
                              ? 'expense'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {currentStatus.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                      {staff.role_title || 'Worker'} &bull; {staff.payment_type}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedStaffForCalendar(staff)}
                    className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition ml-auto sm:ml-2 cursor-pointer"
                    title="View Monthly Calendar"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>

                {/* 1-Tap Quick Action Buttons (High Tap Targets for Mobile) */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Present Button */}
                  <button
                    type="button"
                    onClick={() => setStaffStatus(staff.id, 'present')}
                    className={`min-w-[42px] h-9 px-3 rounded-xl text-xs font-bold border transition-all duration-150 cursor-pointer active:scale-90 flex items-center justify-center gap-1 ${
                      currentStatus === 'present'
                        ? 'bg-[var(--btn-income)] text-white border-[var(--btn-income)] shadow-sm'
                        : 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--income)]/20 hover:text-[var(--income)] hover:border-[var(--income)]/40'
                    }`}
                  >
                    <span>P</span>
                    <span className="hidden min-[420px]:inline text-[10px] font-normal opacity-90">Present</span>
                  </button>

                  {/* Half Day Button */}
                  <button
                    type="button"
                    onClick={() => setStaffStatus(staff.id, 'half')}
                    className={`min-w-[42px] h-9 px-3 rounded-xl text-xs font-bold border transition-all duration-150 cursor-pointer active:scale-90 flex items-center justify-center gap-1 ${
                      currentStatus === 'half'
                        ? 'bg-[var(--warning)] text-black border-[var(--warning)] shadow-sm font-extrabold'
                        : 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--warning)]/20 hover:text-[var(--warning)] hover:border-[var(--warning)]/40'
                    }`}
                  >
                    <span>H</span>
                    <span className="hidden min-[420px]:inline text-[10px] font-normal opacity-90">Half</span>
                  </button>

                  {/* Absent Button */}
                  <button
                    type="button"
                    onClick={() => setStaffStatus(staff.id, 'absent')}
                    className={`min-w-[42px] h-9 px-3 rounded-xl text-xs font-bold border transition-all duration-150 cursor-pointer active:scale-90 flex items-center justify-center gap-1 ${
                      currentStatus === 'absent'
                        ? 'bg-[var(--btn-expense)] text-white border-[var(--btn-expense)] shadow-sm'
                        : 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--expense)]/20 hover:text-[var(--expense)] hover:border-[var(--expense)]/40'
                    }`}
                  >
                    <span>A</span>
                    <span className="hidden min-[420px]:inline text-[10px] font-normal opacity-90">Absent</span>
                  </button>

                  {/* Leave Paid Button */}
                  <button
                    type="button"
                    onClick={() => setStaffStatus(staff.id, 'leave_paid')}
                    className={`h-9 px-2.5 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer active:scale-90 ${
                      currentStatus === 'leave_paid'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)] hover:text-purple-400 hover:border-purple-400/40'
                    }`}
                  >
                    Leave
                  </button>

                  {/* Overtime Stepper */}
                  <div className="flex items-center gap-1 pl-1 ml-auto sm:ml-0 bg-[var(--surface-2)] p-0.5 rounded-xl border border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => adjustOvertime(staff.id, -1)}
                      disabled={otHours <= 0}
                      className="w-8 h-8 rounded-lg bg-[var(--surface)] text-[var(--text)] flex items-center justify-center hover:bg-[var(--surface-2)] transition disabled:opacity-40 cursor-pointer active:scale-95"
                      title="Decrease OT hours"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-mono text-xs font-bold text-[var(--accent)]">
                      {otHours}h
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustOvertime(staff.id, 1)}
                      className="w-8 h-8 rounded-lg bg-[var(--surface)] text-[var(--text)] flex items-center justify-center hover:bg-[var(--surface-2)] transition cursor-pointer active:scale-95"
                      title="Increase OT hours"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Monthly Calendar Modal */}
      <AttendanceCalendarModal
        isOpen={!!selectedStaffForCalendar}
        onClose={() => setSelectedStaffForCalendar(null)}
        staff={selectedStaffForCalendar}
        onUpdated={loadData}
      />
    </div>
  );
};
