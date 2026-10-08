import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LocalStaff, LocalAttendanceEntry, localDb } from '@/lib/db/dexie';
import { attendanceRepo, generateUUID } from '@/lib/db/repository';
import { useOrg } from '@/features/org/orgContext';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/lib/i18n/i18nContext';
import {
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  Check,
  X,
  Clock,
} from 'lucide-react';

interface AttendanceCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: LocalStaff | null;
  onUpdated: () => void;
}

export const AttendanceCalendarModal: React.FC<AttendanceCalendarModalProps> = ({
  isOpen,
  onClose,
  staff,
  onUpdated,
}) => {
  const { currentOrg } = useOrg();
  const { success, error } = useToast();
  const { t, formatDate } = useI18n();

  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [entries, setEntries] = useState<Record<string, LocalAttendanceEntry>>({});
  const [editingDay, setEditingDay] = useState<string | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-indexed

  const loadMonthData = async () => {
    if (!staff || !currentOrg) return;
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-31`;

    const records = await localDb.attendance_entries
      .where('staff_id')
      .equals(staff.id)
      .filter((a) => !a.deleted_at && a.work_date >= startStr && a.work_date <= endStr)
      .toArray();

    const map: Record<string, LocalAttendanceEntry> = {};
    records.forEach((r) => {
      map[r.work_date] = r;
    });
    setEntries(map);
  };

  useEffect(() => {
    if (isOpen) {
      loadMonthData();
      setEditingDay(null);
    }
  }, [isOpen, staff, currentMonth]);

  if (!staff) return null;

  // Calendar dates generation
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleSetDayStatus = async (
    dateStr: string,
    status: 'present' | 'absent' | 'half' | 'leave_paid' | 'leave_unpaid' | 'holiday'
  ) => {
    if (!currentOrg) return;
    try {
      const existing = entries[dateStr];
      if (existing) {
        await attendanceRepo.update(existing.id, {
          status,
          updated_at: new Date().toISOString(),
        });
      } else {
        await attendanceRepo.create({
          org_id: currentOrg.id,
          staff_id: staff.id,
          work_date: dateStr,
          status,
          overtime_hours: 0,
        });
      }
      success(`Updated attendance for ${formatDate(dateStr)}`);
      await loadMonthData();
      onUpdated();
      setEditingDay(null);
    } catch {
      error('Failed to update attendance');
    }
  };

  // Status badge styling helper
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'present':
        return 'bg-[var(--income)]/20 text-[var(--income)] border-[var(--income)]/40';
      case 'half':
        return 'bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/40';
      case 'absent':
        return 'bg-[var(--expense)]/20 text-[var(--expense)] border-[var(--expense)]/40';
      case 'leave_paid':
      case 'leave_unpaid':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'holiday':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      default:
        return 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]';
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-[var(--accent)]" />
            <span className="truncate">{staff.name} — Monthly Calendar</span>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        {/* Month Navigation */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface-2)]">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-sm text-[var(--text)]">
            {monthNames[month]} {year}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[var(--text-muted)]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {/* Empty spacer blocks for start of month */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12 rounded-xl bg-transparent" />
          ))}

          {/* Actual days in month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const entry = entries[dateStr];
            const isEditing = editingDay === dateStr;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setEditingDay(isEditing ? null : dateStr)}
                className={`h-12 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer relative active:scale-95 ${
                  isEditing
                    ? 'ring-2 ring-[var(--accent)] border-[var(--accent)] bg-[var(--surface)] font-bold'
                    : getStatusColor(entry?.status)
                }`}
              >
                <span className="text-xs font-semibold">{dayNum}</span>
                {entry && (
                  <span className="text-[10px] font-bold leading-none uppercase">
                    {entry.status === 'present'
                      ? 'P'
                      : entry.status === 'half'
                      ? 'H'
                      : entry.status === 'absent'
                      ? 'A'
                      : entry.status === 'leave_paid'
                      ? 'LP'
                      : entry.status === 'leave_unpaid'
                      ? 'LU'
                      : 'Hol'}
                  </span>
                )}
                {entry?.overtime_hours ? (
                  <span className="absolute top-1 right-1 text-[9px] font-bold text-[var(--accent)]">
                    +{entry.overtime_hours}h
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Quick status picker for tapped day */}
        {editingDay && (
          <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text)]">
                Mark status for {formatDate(editingDay)}:
              </span>
              <button
                type="button"
                onClick={() => setEditingDay(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-xs">
              <Button
                variant="income"
                size="sm"
                onClick={() => handleSetDayStatus(editingDay, 'present')}
              >
                Present (P)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-[var(--warning)]"
                onClick={() => handleSetDayStatus(editingDay, 'half')}
              >
                Half (H)
              </Button>
              <Button
                variant="expense"
                size="sm"
                onClick={() => handleSetDayStatus(editingDay, 'absent')}
              >
                Absent (A)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetDayStatus(editingDay, 'leave_paid')}
              >
                Paid Leave
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetDayStatus(editingDay, 'leave_unpaid')}
              >
                Unpaid Leave
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSetDayStatus(editingDay, 'holiday')}
              >
                Holiday
              </Button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-[11px] text-[var(--text-muted)] border-t border-[var(--border)]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--income)]" /> Present
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--warning)]" /> Half Day
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--expense)]" /> Absent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Leave
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Holiday
          </span>
        </div>
      </div>
    </Modal>
  );
};
