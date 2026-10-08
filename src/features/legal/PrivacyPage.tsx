import React from 'react';
import { Card } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n/i18nContext';
import { Shield } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="space-y-5 animate-in fade-in max-w-2xl text-left">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{t('privacy.title')}</h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
          Privacy by design, zero surveillance, local-first storage
        </p>
      </div>

      <Card variant="surface" className="space-y-4 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1">1. Local Storage First</h3>
          <p>
            Your staff records, attendance, wages, and logs are stored locally on your device in IndexedDB. When cloud sync is active, your data is synced securely to your private database partition protected by Row Level Security (RLS).
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1">2. Strict Data Minimization</h3>
          <p>
            Staff Manager intentionally does not collect or store government identity numbers (such as Aadhaar, SSN, or national ID), credit card numbers, or full bank account details. UPI IDs or payment notes are strictly optional free text for your own reference.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm text-[var(--text)] mb-1">3. No Advertising or Data Selling</h3>
          <p>
            We do not sell, rent, or trade your data to third parties. We do not run invasive tracking or behavioural advertising scripts.
          </p>
        </div>
      </Card>
    </div>
  );
};
