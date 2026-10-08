import React, { useState } from 'react';
import { usePWAInstall } from '@/lib/pwa/usePWAInstall';
import { useI18n } from '@/lib/i18n/i18nContext';
import { Download, Share2 } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { t } = useI18n();

  // If already installed, don't show
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center gap-1.5 font-medium rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 transition active:scale-95 cursor-pointer shadow-xs ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{t('pwa.installApp')}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-1.5 font-medium rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)] transition active:scale-95 cursor-pointer ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs sm:text-sm'
          }`}
        >
          <Share2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
          <span>{t('pwa.installIOS')}</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur-xs"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 shadow-2xl text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-[var(--text)]">
                {t('pwa.iosGuideTitle')}
              </h3>
              <div className="mt-3 space-y-2 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                <p>{t('pwa.iosGuideStep1')}</p>
                <p>{t('pwa.iosGuideStep2')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-[var(--surface-2)] text-[var(--text)] font-semibold text-xs hover:bg-[var(--border)] transition"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
