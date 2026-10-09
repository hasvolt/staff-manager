import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useI18n } from '@/lib/i18n/i18nContext';
import { FileText, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const TermsPage: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="space-y-6 animate-in fade-in max-w-3xl text-left pb-12">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-[var(--accent)]" />
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{t('terms.title')}</h1>
        </div>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
          Terms of Service, Operating Responsibilities &amp; Legal Boundaries
        </p>
      </div>

      {/* Prominent Legal Disclaimer */}
      <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 space-y-1.5 text-xs text-[var(--text)]">
        <div className="flex items-center gap-2 font-bold text-blue-500">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Operational Boundary Notice</span>
        </div>
        <p className="leading-relaxed">
          Staff Manager is an administrative bookkeeping and operational tracking utility. It is not an accounting firm, payroll processing agency, tax consultancy, or legal representative. Use of the software does not constitute professional legal or tax advice.
        </p>
      </div>

      <Card variant="surface" className="space-y-4 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1">1. User Accountability for Records</h3>
          <p>
            You are solely responsible for ensuring the accuracy and validity of all staff profiles, daily attendance logs, wage rates, and financial transactions recorded in the application. Any settlements, salary slips, or vouchers produced reflect the data entered by you or authorized members of your team.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1">2. Multi-User Access &amp; Organization Roles</h3>
          <p>
            When you invite team members (such as Managers, Supervisors, or Accountants), you determine their access level. You are responsible for revoking access when team members depart or change roles. The business Owner retains ultimate responsibility for all organization data.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1">3. Offline Operation &amp; Data Synchronization</h3>
          <p>
            Staff Manager allows full offline operation using local device storage. You acknowledge that timely cloud backup and synchronization depends on periodic network connectivity. While robust conflict resolution and rolling snapshots are provided, users are encouraged to export periodic backups.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1">4. Acceptable Use</h3>
          <p>
            You agree not to use the service for unlawful purposes, fraudulent wage claims, harassment, or to intentionally breach labor standards. You agree to inform your staff that administrative attendance and payment records are maintained digitally.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1">5. Account Termination &amp; Data Rights</h3>
          <p>
            You may stop using Staff Manager at any time. Business owners may permanently delete their business and its associated cloud records via the account interface. You retain all intellectual property rights to your business content and data.
          </p>
        </div>
      </Card>
    </div>
  );
};
