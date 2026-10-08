import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useTheme, ALL_THEMES, ThemeName } from '@/lib/theme/themeContext';
import { useI18n } from '@/lib/i18n/i18nContext';
import { Check } from 'lucide-react';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('theme.title')}
      maxWidth="md"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ALL_THEMES.map((item) => {
          const isSelected = theme === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTheme(item.id as ThemeName);
                onClose();
              }}
              className={`flex flex-col items-start p-3 rounded-2xl border text-left transition relative cursor-pointer active:scale-97 ${
                isSelected
                  ? 'border-[var(--accent)] ring-2 ring-[var(--accent)] shadow-md'
                  : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--text-muted)]'
              }`}
            >
              {/* Swatch preview */}
              <div
                className="w-full h-10 rounded-xl mb-2 flex items-center justify-between px-2.5 shadow-inner"
                style={{ backgroundColor: item.bg, border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: item.accent }}
                />
                {isSelected && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: item.accent, color: item.isLight ? '#000' : '#fff' }}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-[var(--text)] line-clamp-1">
                {t(item.nameKey)}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {item.isLight ? 'Light Theme' : 'Dark Theme'}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
