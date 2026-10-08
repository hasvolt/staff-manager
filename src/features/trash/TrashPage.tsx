import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useI18n } from '@/lib/i18n/i18nContext';
import { Trash2, RotateCcw } from 'lucide-react';

export const TrashPage: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{t('trash.title')}</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Never lose data by accident: soft delete everywhere with instant restore
          </p>
        </div>
      </div>

      <EmptyState
        icon={<Trash2 className="w-6 h-6" />}
        title="Recycle Bin is empty"
        description="Any staff member, attendance log, or payment deleted in the app moves here first and can be restored anytime."
      />
    </div>
  );
};
