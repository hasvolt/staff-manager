import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useTheme, ALL_THEMES, ThemeName } from '@/lib/theme/themeContext';
import { useI18n } from '@/lib/i18n/i18nContext';
import { Check, Sparkles, Sun, Moon, Palette, ShieldCheck } from 'lucide-react';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const [filterMode, setFilterMode] = useState<'all' | 'dark' | 'light'>('all');

  const filteredThemes = ALL_THEMES.filter((item) => {
    if (filterMode === 'dark') return !item.isLight;
    if (filterMode === 'light') return item.isLight;
    return true;
  });

  const activeThemeConfig = ALL_THEMES.find((item) => item.id === theme) || ALL_THEMES[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Theme Colors & Visual Mode / थीम रंग"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Active Theme Preview Banner */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center font-bold shadow-xs">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[var(--text)]">
                    {activeThemeConfig.nameEn}
                  </h4>
                  <span className="text-[10px] font-semibold bg-[var(--accent)] text-[var(--accent-contrast)] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Active
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {t(activeThemeConfig.nameKey)} • {activeThemeConfig.isLight ? 'Light Theme' : 'Dark Theme'}
                </p>
              </div>
            </div>

            {/* Quick Toggle to Default Flagship Navy */}
            {theme !== 'deep-obsidian' && (
              <button
                type="button"
                onClick={() => setTheme('deep-obsidian')}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)] transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Navy</span>
              </button>
            )}
          </div>

          {/* Mini Live UI Sample */}
          <div
            className="rounded-xl p-3 border border-[var(--border)] flex items-center justify-between gap-2 shadow-inner"
            style={{ backgroundColor: activeThemeConfig.bg }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ backgroundColor: activeThemeConfig.accent, color: activeThemeConfig.isLight ? '#000' : '#fff' }}
              >
                SM
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate" style={{ color: activeThemeConfig.isLight ? '#0F172A' : '#F8FAFC' }}>
                  Sample Staff Card
                </span>
                <span className="text-[11px] block truncate" style={{ color: activeThemeConfig.isLight ? '#64748B' : '#94A3B8' }}>
                  ₹45,000 • Present Today
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                P Present
              </span>
              <span
                className="text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ backgroundColor: activeThemeConfig.accent, color: activeThemeConfig.isLight ? '#000' : '#fff' }}
              >
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              filterMode === 'all'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>All Themes ({ALL_THEMES.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('dark')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              filterMode === 'dark'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark (10)</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('light')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              filterMode === 'light'
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light (2)</span>
          </button>
        </div>

        {/* Themes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
          {filteredThemes.map((item) => {
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTheme(item.id as ThemeName);
                }}
                className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all relative cursor-pointer active:scale-97 group ${
                  isSelected
                    ? 'border-[var(--accent)] ring-2 ring-[var(--accent)] shadow-md bg-[var(--surface)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--text-muted)]/50 hover:bg-[var(--surface)]'
                }`}
              >
                {/* Badge if Recommended */}
                {item.tag && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold text-sky-400 bg-sky-950/80 border border-sky-500/40 px-1.5 py-0.5 rounded-md">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{item.tag}</span>
                  </div>
                )}

                {/* Swatch preview */}
                <div
                  className="w-full h-12 rounded-xl mb-2.5 flex items-center justify-between px-3 shadow-inner relative overflow-hidden"
                  style={{ backgroundColor: item.bg, border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {/* Surface layer inside */}
                  <div
                    className="w-6 h-6 rounded-md shadow-xs border border-white/10 flex items-center justify-center"
                    style={{ backgroundColor: item.surface }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.accent }}
                    />
                  </div>

                  {isSelected ? (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md animate-in zoom-in-75 duration-150"
                      style={{ backgroundColor: item.accent, color: item.isLight ? '#000' : '#fff' }}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div
                      className="w-3 h-3 rounded-full opacity-60 group-hover:scale-125 transition-transform"
                      style={{ backgroundColor: item.accent }}
                    />
                  )}
                </div>

                <div className="w-full">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[var(--text)] line-clamp-1">
                      {item.nameEn}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                    {t(item.nameKey)}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]/75 mt-0.5 block">
                    {item.isLight ? 'Light Mode' : 'Dark Mode'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Theme applies instantly & saves to device
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] font-bold text-xs cursor-pointer hover:opacity-95 transition"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
