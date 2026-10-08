import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { DatePicker } from '@/components/ui/DatePicker';
import { useI18n } from '@/lib/i18n/i18nContext';
import { CalendarCheck, CheckCheck } from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { t, formatDate } = useI18n();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{t('attendance.title')}</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Quick 10-second attendance marker with 1-tap presets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-44">
            <DatePicker
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <Button variant="income" size="sm">
            <CheckCheck className="w-4 h-4" />
            <span>Mark All Present</span>
          </Button>
        </div>
      </div>

      <EmptyState
        icon={<CalendarCheck className="w-6 h-6" />}
        title={`No attendance logs for ${formatDate(selectedDate)}`}
        description="Once staff members are added in Phase 2, you can quickly mark Present, Half-day, Leave, or Overtime here."
      />
    </div>
  );
};
