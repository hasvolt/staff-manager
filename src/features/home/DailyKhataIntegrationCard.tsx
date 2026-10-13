import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useOrg } from '@/features/org/orgContext';
import { useToast } from '@/components/ui/Toast';
import { localDb } from '@/lib/db/dexie';
import { exportToCSV } from '@/lib/export/csvExport';
import { formatCurrency, formatDate } from '@/lib/format/formatters';
import {
  ExternalLink,
  Calculator,
  Download,
  Share2,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const DailyKhataIntegrationCard: React.FC = () => {
  const { currentOrg } = useOrg();
  const { success, error } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const dailyKhataUrl = import.meta.env.VITE_DAILY_KHATA_URL || 'https://www.rozfiber.com';
  const advancedCalcUrl = import.meta.env.VITE_ADVANCED_CALCULATOR_URL || 'https://www.rozfiber.com/calculator';

  const handleExportPaymentsForKhata = async () => {
    if (!currentOrg?.id) return;
    setIsExporting(true);

    try {
      const payments = await localDb.payments
        .where('org_id')
        .equals(currentOrg.id)
        .filter((p) => !p.deleted_at)
        .toArray();

      const staffList = await localDb.staff
        .where('org_id')
        .equals(currentOrg.id)
        .toArray();

      const staffMap = new Map(staffList.map((s) => [s.id, s.name]));

      const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Mode', 'Reference'];
      const rows = payments.map((p) => {
        const staffName = staffMap.get(p.staff_id) || 'Staff';
        const typeLabel =
          p.type === 'salary'
            ? 'Staff Salary Expense'
            : p.type === 'advance'
            ? 'Staff Advance (Udhar)'
            : p.type === 'bonus'
            ? 'Bonus Expense'
            : 'Staff Payment';

        return [
          p.pay_date,
          'Staff & Labor Expense',
          `${typeLabel} - ${staffName} (${p.note || ''})`.trim(),
          p.amount,
          p.mode || 'Cash',
          p.reference || '',
        ];
      });

      exportToCSV(`${currentOrg.name}_Expenses_for_DailyKhata`, headers, rows);
      success('Exported payments CSV ready for Daily Khata Pro!');
    } catch (e: any) {
      error(e.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card variant="surface" className="p-4 sm:p-5 border border-[var(--border)] shadow-xs space-y-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--surface-2)] border border-[var(--border)] px-2 py-0.5 rounded-lg">
              Sister Product
            </span>
            <h3 className="font-bold text-sm sm:text-base text-[var(--text)]">Daily Khata Pro Integration</h3>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
            Maintain complete business ledgers, customer accounts (Khata), cashbook, and advanced financial calculators.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={dailyKhataUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-bold hover:opacity-90 transition active:scale-95 shadow-2xs"
          >
            <span>Open Daily Khata</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Export for Daily Khata */}
        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 space-y-3 flex flex-col justify-between">
          <div>
            <span className="font-bold text-xs sm:text-sm text-[var(--text)] block">Export Payouts for Expense Entry</span>
            <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block leading-relaxed">
              Download payment vouchers and salaries formatted for easy import or entry into your daily Khata expenses.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPaymentsForKhata}
            isLoading={isExporting}
            className="w-full justify-center"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export Expenses CSV</span>
          </Button>
        </div>

        {/* Advanced Calculators Redirect */}
        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 space-y-3 flex flex-col justify-between">
          <div>
            <span className="font-bold text-xs sm:text-sm text-[var(--text)] block">Advanced Calculators</span>
            <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block leading-relaxed">
              Direct access to EMI, loan interest, profit margin, GST, and compound growth calculators on Daily Khata.
            </span>
          </div>
          <a
            href={advancedCalcUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs font-semibold hover:border-[var(--accent)] transition text-center active:scale-95 shadow-2xs"
          >
            <Calculator className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Launch Advanced Calculators</span>
          </a>
        </div>
      </div>
    </Card>
  );
};
