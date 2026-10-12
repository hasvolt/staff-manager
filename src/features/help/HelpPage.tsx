import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useOrg } from '@/features/org/orgContext';
import { useToast } from '@/components/ui/Toast';
import { insertDemoData, removeDemoData } from '@/lib/demo/demoDataService';
import {
  HelpCircle,
  CheckCircle2,
  Users,
  CalendarCheck,
  CreditCard,
  FileText,
  UserCheck,
  Trash2,
  Sparkles,
  RotateCcw,
  BookOpen,
} from 'lucide-react';

export const HelpPage: React.FC = () => {
  const { t } = useI18n();
  const { currentOrg } = useOrg();
  const { success, error, info } = useToast();
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@rozfiber.com';

  const [activeGuide, setActiveGuide] = useState<string>('add_staff');
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // How-to guides in clear, accessible plain language
  const guides = [
    {
      id: 'add_staff',
      title: '1. How to Add Staff & Set Wage Rates',
      icon: Users,
      steps: [
        'Open the "Staff" tab and tap "Add Staff" (+).',
        'Enter staff name, optional phone, and job designation (Mistri, Helper, Driver, Cashier).',
        'Choose payment type: Daily Wage, Monthly Salary, Hourly, or Per Piece.',
        'Enter wage rate and optional overtime rate per hour. Tap Save.',
      ],
    },
    {
      id: 'mark_attendance',
      title: '2. How to Mark Daily Attendance',
      icon: CalendarCheck,
      steps: [
        'Open the "Attendance" tab.',
        'Use "Mark All Present" to quickly check in all active workers in 1 tap.',
        'Tap individual status chips for exceptions: Half day, Absent, Paid Leave, or Overtime.',
        'Switch between today, past dates, or the monthly calendar view per staff member.',
      ],
    },
    {
      id: 'record_payments',
      title: '3. How to Record Payments & Advances (Udhar)',
      icon: CreditCard,
      steps: [
        'Open the "Payments" tab and tap "Record Payment".',
        'Select the staff member and select transaction type: Salary, Advance, Bonus, or Deduction.',
        'Enter amount (use the built-in calculator icon if calculating on the fly).',
        'Select payment mode (Cash, UPI, Bank Transfer) and tap Save.',
      ],
    },
    {
      id: 'settle_month',
      title: '4. How to Settle Month & Lock Periods',
      icon: FileText,
      steps: [
        'Under Payments, click "Settle Month".',
        'Review computed earned wages, advances taken, and net balance owed.',
        'Record payouts directly from the settlement screen.',
        'Optionally "Lock Month" to prevent accidental modifications to past attendance or wages.',
      ],
    },
    {
      id: 'print_statement',
      title: '5. How to Print Salary Slips & Statements',
      icon: BookOpen,
      steps: [
        'Go to "Reports" tab.',
        'Choose Salary Slip, Attendance Register, or Advances Ledger.',
        'Select the staff member or date range preset (This Month, Last 3 Months, Custom).',
        'Tap "Print Document" (works first time in crisp black & white) or "Download PDF".',
      ],
    },
    {
      id: 'invite_team',
      title: '6. How to Invite Managers & Supervisors',
      icon: UserCheck,
      steps: [
        'Open the side drawer menu and tap "Team Members & Roles".',
        'Select "Invite Links" and choose role: Manager, Supervisor, Accountant, or Viewer.',
        'For Supervisors, optionally limit their view to specific sites or projects.',
        'Tap "Generate Invite Link" and share via WhatsApp or SMS.',
      ],
    },
    {
      id: 'restore_trash',
      title: '7. How to Restore Records from Trash',
      icon: Trash2,
      steps: [
        'Open the side drawer menu and click "Trash (Recycle Bin)".',
        'Locate the deleted staff member, attendance entry, or payment.',
        'Tap "Restore" to immediately return the item with all historical links intact.',
      ],
    },
  ];

  const handleLoadDemoData = async () => {
    if (!currentOrg?.id) return;
    setIsDemoLoading(true);
    try {
      const stats = await insertDemoData(currentOrg.id);
      success(`Sample demo data loaded: ${stats.staffCount} staff, ${stats.attendanceCount} attendance entries, and ${stats.paymentCount} payments!`);
    } catch (e: any) {
      error(e.message || 'Failed to load demo data');
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleRemoveDemoData = async () => {
    if (!currentOrg?.id) return;
    if (!confirm('Remove sample demo records from your business?')) return;
    setIsDemoLoading(true);
    try {
      await removeDemoData(currentOrg.id);
      success('Sample demo records removed cleanly.');
    } catch (e: any) {
      error(e.message || 'Failed to remove demo data');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-3xl text-left pb-12">
      <div>
        <div className="flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-[var(--accent)]" />
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{t('help.title')}</h1>
        </div>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
          Step-by-step guides, sample demo data, and support for your business
        </p>
      </div>

      {/* Interactive Sample Demo Data Card */}
      <Card variant="gradient" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-[var(--text)]">Practice with Sample Demo Data</h3>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Instantly populate sample staff, attendance, and advance records to test calculations and statements. Clean up anytime in 1 tap.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={handleLoadDemoData}
              isLoading={isDemoLoading}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Load Demo Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveDemoData}
              disabled={isDemoLoading}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Clear Demo
            </Button>
          </div>
        </div>
      </Card>

      {/* Step-by-Step Guides Accordion / List */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-[var(--text)] uppercase tracking-wider text-xs">
          Essential How-To Guides
        </h3>

        <div className="space-y-2">
          {guides.map((g) => {
            const Icon = g.icon;
            const isOpen = activeGuide === g.id;
            return (
              <div
                key={g.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setActiveGuide(isOpen ? '' : g.id)}
                  className="w-full p-3.5 flex items-center justify-between text-left font-semibold text-xs sm:text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>{g.title}</span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 space-y-2 text-xs sm:text-sm text-[var(--text-muted)] border-t border-[var(--border)] bg-[var(--surface)]">
                    <ol className="list-decimal list-inside space-y-1.5 pt-2">
                      {g.steps.map((st, i) => (
                        <li key={i} className="leading-relaxed">
                          <span className="text-[var(--text)]">{st}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Documentation Portal Link */}
      <Card variant="surface" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-[var(--accent)]/30 bg-[var(--surface-2)]/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="font-bold text-sm text-[var(--text)]">Official Rozfiber Documentation Portal</h3>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Explore complete user manuals, API guides, step-by-step videos, and platform guides at <span className="font-mono text-[var(--accent)]">docs.rozfiber.com/staff-manager/</span>.
          </p>
        </div>
        <a
          href="https://docs.rozfiber.com/staff-manager/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition shrink-0 text-center flex items-center justify-center gap-1.5"
        >
          <span>Open docs.rozfiber.com</span>
          <span>↗</span>
        </a>
      </Card>

      {/* Support Card */}
      <Card variant="surface" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold text-sm text-[var(--text)]">Need additional assistance?</h4>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Reach out to our customer support desk for questions or feedback.
          </p>
        </div>
        <a
          href={`mailto:${supportEmail}`}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition shrink-0 text-center"
        >
          {t('menu.support')}
        </a>
      </Card>
    </div>
  );
};
