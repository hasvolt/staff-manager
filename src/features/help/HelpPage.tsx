import React from 'react';
import { Card } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n/i18nContext';
import { HelpCircle, CheckCircle2, PhoneCall } from 'lucide-react';

export const HelpPage: React.FC = () => {
  const { t } = useI18n();
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@rozfiber.com';

  const faqs = [
    {
      q: 'Does Staff Manager work without an active internet connection?',
      a: 'Yes! Staff Manager is offline-first. You can record daily attendance, staff entries, and calculate payments completely offline. Data is saved to your device and automatically synced when you reconnect.',
    },
    {
      q: 'How does the basic calculator work with salary and wages?',
      a: 'Every payment and rate field has a calculator icon. You can tap it to calculate sums, percentages, or overtime. Clicking "Use Result" automatically enters the number into the field.',
    },
    {
      q: 'Can I access advanced financial calculators?',
      a: 'Yes. Tap the "Advanced Calculators" button in the menu or calculator modal to access the full calculator suite on Daily Khata Pro.',
    },
    {
      q: 'What happens if I delete a record accidentally?',
      a: 'Staff Manager uses soft delete. All deleted staff, attendance records, and payments go to the Trash (Recycle Bin) where they can be restored at any time.',
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{t('help.title')}</h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">{t('help.desc')}</p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => (
          <Card key={idx} variant="surface" className="text-left space-y-1.5">
            <h4 className="font-semibold text-sm text-[var(--text)] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
              <span>{faq.q}</span>
            </h4>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed pl-6">
              {faq.a}
            </p>
          </Card>
        ))}
      </div>

      <Card variant="gradient" className="flex items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold text-sm text-[var(--text)]">Need additional assistance?</h4>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Reach out to our dedicated support desk.</p>
        </div>
        <a
          href={`mailto:${supportEmail}`}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition shrink-0"
        >
          {t('menu.support')}
        </a>
      </Card>
    </div>
  );
};
