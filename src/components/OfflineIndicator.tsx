import React from 'react';
import { useOnlineStatus } from '@/lib/pwa/useOnlineStatus';
import { useI18n } from '@/lib/i18n/i18nContext';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t } = useI18n();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 py-1.5 px-3 bg-[var(--warning)] text-black text-center text-xs font-semibold flex items-center justify-center gap-2 shadow-md">
      <WifiOff className="w-3.5 h-3.5" />
      <span>{t('common.offline')} &mdash; Working locally without internet</span>
    </div>
  );
};
