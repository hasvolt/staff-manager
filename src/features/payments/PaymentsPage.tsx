import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useI18n } from '@/lib/i18n/i18nContext';
import { CreditCard, PlusCircle, ExternalLink } from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const { t } = useI18n();
  const advancedCalcUrl = import.meta.env.VITE_ADVANCED_CALCULATOR_URL || 'https://www.rozfiber.com/calculator';

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{t('payments.title')}</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Wages, advances (peshgi/udhar), bonuses, deductions &amp; ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
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
          <Button variant="expense" size="sm">
            <PlusCircle className="w-4 h-4" />
            <span>Record Payment</span>
          </Button>
        </div>
      </div>

      <EmptyState
        icon={<CreditCard className="w-6 h-6" />}
        title="No payment records found"
        description="Prorated monthly salaries, daily wage calculations, advances, and month settlements will be calculated automatically in Phase 3."
      />
    </div>
  );
};
