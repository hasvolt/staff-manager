import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useI18n } from '@/lib/i18n/i18nContext';
import { LanguageCode } from '@/locales/types';
import { Check } from 'lucide-react';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage, languages, t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('language.title')}
      maxWidth="md"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[60vh] overflow-y-auto p-1">
        {languages.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setLanguage(lang.code as LanguageCode);
                onClose();
              }}
              className={`flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer active:scale-97 ${
                isSelected
                  ? 'border-[var(--accent)] bg-[var(--surface-2)] ring-1 ring-[var(--accent)] font-semibold'
                  : 'border-[var(--border)] bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] hover:border-[var(--text-muted)]'
              }`}
            >
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-sm text-[var(--text)] font-medium leading-tight">
                  {lang.nativeName}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {lang.name} {lang.isRTL && '(RTL)'}
                </span>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
