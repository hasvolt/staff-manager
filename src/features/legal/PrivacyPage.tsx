import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useI18n } from '@/lib/i18n/i18nContext';
import { Shield, Lock, FileText, CheckCircle2, Download, AlertCircle, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export const PrivacyPage: React.FC = () => {
  const { t } = useI18n();
  const { success } = useToast();
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const staffNoticeTemplate = `NOTICE TO WORKERS & EMPLOYEES:
This establishment uses "Staff Manager" (a local digital attendance and wage management utility) to track daily attendance, work logs, wage calculations, advance payouts, and balance settlements.
- What is recorded: Your name, assigned designation, daily attendance status (Present, Half Day, Leave), hours/units worked, and payment records.
- What is NOT collected: No national ID document numbers, bank cards, or sensitive personal data are stored.
- Statements: You may request a printed salary slip or payment voucher at any time.`;

  const handleCopyNotice = () => {
    navigator.clipboard.writeText(staffNoticeTemplate);
    setCopiedTemplate(true);
    success('Worker Notice template copied to clipboard!');
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-3xl text-left pb-12">
      <div>
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-[var(--accent)]" />
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{t('privacy.title')}</h1>
        </div>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
          Privacy Policy, Data Protection Principles &amp; Workplace Notice Template
        </p>
      </div>

      {/* Compliance & Disclaimer Banner */}
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1.5 text-xs text-[var(--text)]">
        <div className="flex items-center gap-2 font-bold text-amber-500">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Record-Keeping Utility Disclaimer</span>
        </div>
        <p className="leading-relaxed">
          Staff Manager is a digital record-keeping utility designed for small businesses, contractors, shops, workshops, farms, and households. It is not payroll compliance, taxation, PF/ESI, or government filing software. Business owners are responsible for complying with local labor laws and wage regulations.
        </p>
      </div>

      {/* Privacy Commitments */}
      <Card variant="surface" className="space-y-4 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>1. What Data is Stored</span>
          </h3>
          <p>
            Staff Manager stores information entered by the business owner or manager: staff names, optional phone numbers, roles (e.g. mistri, helper, cashier), wage rates, daily attendance entries, work notes, payments, advances (udhar/peshgi), and settlement records.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>2. Strict Privacy: What We NEVER Store</span>
          </h3>
          <p>
            Staff Manager deliberately enforces a strict privacy policy: we <strong>never store government identity numbers</strong> (such as Aadhaar, Social Security, National ID, or passport numbers), credit/debit card numbers, or full bank account details. Any UPI ID or payment note is strictly optional free text for your business records.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>3. Where Data is Stored &amp; Offline First</span>
          </h3>
          <p>
            All records are stored directly on your physical device using browser IndexedDB. When connected to the cloud, data is securely synchronized to a private PostgreSQL partition protected by Row Level Security (RLS). Only authenticated members of your organization can access your business records.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>4. No Data Selling or Third-Party Advertising</span>
          </h3>
          <p>
            We do not sell, rent, monetize, or disclose your business records or staff data to any advertisers, data brokers, or third parties. No third-party ad networks or tracking trackers are embedded in Staff Manager.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>5. Data Retention, Export &amp; Deletion</span>
          </h3>
          <p>
            You retain 100% ownership of your business data. You can download a full JSON or CSV export at any moment. Account owners can delete their business or account at any time, which permanently removes cloud database records per database cascading policies.
          </p>
        </div>
      </Card>

      {/* Customizable Workplace Notice Template */}
      <Card variant="surface" className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
          <div>
            <h3 className="font-semibold text-sm text-[var(--text)]">Workplace Consent &amp; Notice Template</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Template you can display or provide to employees regarding record-keeping
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopyNotice}>
            {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedTemplate ? 'Copied' : 'Copy Template'}</span>
          </Button>
        </div>

        <pre className="text-xs font-mono p-3 rounded-xl bg-[var(--surface-2)] text-[var(--text)] whitespace-pre-wrap leading-relaxed border border-[var(--border)]">
          {staffNoticeTemplate}
        </pre>
      </Card>
    </div>
  );
};
