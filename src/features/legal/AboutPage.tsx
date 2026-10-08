import React from 'react';
import { Card } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n/i18nContext';
import { Users, ExternalLink, ShieldCheck } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { t } = useI18n();
  const dailyKhataUrl = import.meta.env.VITE_DAILY_KHATA_URL || 'https://www.rozfiber.com';

  return (
    <div className="space-y-5 animate-in fade-in max-w-2xl text-left">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{t('about.title')}</h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
          Dedicated workforce management for local contractors, shops, workshops &amp; businesses
        </p>
      </div>

      <Card variant="surface" className="space-y-3 leading-relaxed text-xs sm:text-sm text-[var(--text-muted)]">
        <p className="text-[var(--text)] font-medium">
          {t('about.desc')}
        </p>
        <p>
          Staff Manager is built to solve the daily headache of tracking staff attendance, daily piece work, advances (udhar/peshgi), and settling monthly dues without losing data or relying on fragile paper registers.
        </p>
        <p>
          As a sister product of Daily Khata Pro, it adheres to high standards of local-first reliability, offline data storage, responsive design, and transparent calculations.
        </p>
      </Card>

      <Card variant="gradient" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--surface)]/50 border border-[var(--border)] flex items-center justify-center text-[var(--accent)] font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-[var(--text)]">Daily Khata Pro</h4>
            <p className="text-xs text-[var(--text-muted)]">Practical financial calculators &amp; daily bookkeeping ecosystem</p>
          </div>
        </div>
        <a
          href={dailyKhataUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-xl text-[var(--text)] hover:bg-[var(--surface)] transition shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </Card>
    </div>
  );
};
