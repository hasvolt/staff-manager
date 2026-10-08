import React from 'react';
import { Card } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n/i18nContext';
import { FileText } from 'lucide-react';

export const TermsPage: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="space-y-5 animate-in fade-in max-w-2xl text-left">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{t('terms.title')}</h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
          Software terms and responsibilities
        </p>
      </div>

      <Card variant="surface" className="space-y-4 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1">1. Record Keeping Tool</h3>
          <p>
            Staff Manager is a digital bookkeeping and attendance record-keeping utility. It does not provide certified legal, tax, or payroll compliance advisory services.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1">2. Accuracy of Entries</h3>
          <p>
            You as the employer or business operator remain responsible for verifying the correctness of all recorded hours, piece rates, advances, and payments made to your staff.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1">3. Data Ownership &amp; Export</h3>
          <p>
            You retain 100% ownership of your business records and can export your staff data, attendance ledgers, and payment history at any time in CSV or PDF formats.
          </p>
        </div>
      </Card>
    </div>
  );
};
