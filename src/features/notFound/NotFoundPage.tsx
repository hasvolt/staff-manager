import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n/i18nContext';
import { Home, AlertCircle } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
      <div className="w-16 h-16 rounded-3xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--expense)] mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-[var(--text)] mb-1">{t('notFound.title')}</h2>
      <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-sm mb-6">
        {t('notFound.desc')}
      </p>
      <Button variant="primary" onClick={() => navigate('/')}>
        <Home className="w-4 h-4" />
        <span>{t('notFound.back')}</span>
      </Button>
    </div>
  );
};
