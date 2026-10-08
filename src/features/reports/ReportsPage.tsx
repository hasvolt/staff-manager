import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useI18n } from '@/lib/i18n/i18nContext';
import { BarChart3, Printer, Download } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{t('reports.title')}</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Professional salary slips, attendance registers, PDF &amp; Excel/CSV exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            <span>Print View</span>
          </Button>
        </div>
      </div>

      <EmptyState
        icon={<BarChart3 className="w-6 h-6" />}
        title="No generated reports yet"
        description="Filter by staff, role, project site, or date range to generate one-click printable payment slips and statements (Phase 4)."
      />
    </div>
  );
};
