import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useI18n } from '@/lib/i18n/i18nContext';
import { LanguageCode } from '@/locales/types';
import {
  POPULAR_ONLINE_LANGUAGES,
  loadGoogleTranslateScript,
  translatePageTo,
  resetGoogleTranslate,
  getCurrentGoogleTranslateLanguage,
  isGoogleTranslateActive,
} from '@/lib/i18n/googleTranslate';
import { Check, Globe, Search, Sparkles, RotateCcw, X, Zap } from 'lucide-react';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage, languages, t } = useI18n();
  const [filterMode, setFilterMode] = useState<'all' | 'offline' | 'online'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentOnlineLang, setCurrentOnlineLang] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentOnlineLang(getCurrentGoogleTranslateLanguage());
      loadGoogleTranslateScript().catch(() => {});
    }
  }, [isOpen]);

  const googleActive = isGoogleTranslateActive();

  // Unified items list
  const allLanguageItems = useMemo(() => {
    // Built-in 16
    const offlineList = languages.map((l) => ({
      code: l.code,
      name: l.name,
      nativeName: l.nativeName,
      isRTL: l.isRTL,
      type: 'offline' as const,
    }));

    // Online Google Translate items (excluding ones that are already in offline list to avoid duplication)
    const offlineCodeSet = new Set(offlineList.map((l) => l.code.toLowerCase()));
    const onlineList = POPULAR_ONLINE_LANGUAGES.filter(
      (l) => !offlineCodeSet.has(l.code.toLowerCase())
    ).map((l) => ({
      code: l.code,
      name: l.name,
      nativeName: l.nativeName || l.name,
      isRTL: false,
      type: 'online' as const,
    }));

    return { offlineList, onlineList, combined: [...offlineList, ...onlineList] };
  }, [languages]);

  const filteredLanguages = useMemo(() => {
    let list = allLanguageItems.combined;
    if (filterMode === 'offline') {
      list = allLanguageItems.offlineList;
    } else if (filterMode === 'online') {
      list = allLanguageItems.onlineList;
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();

    return list.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [allLanguageItems, filterMode, searchQuery]);

  const handleSelectLanguage = (item: { code: string; type: 'offline' | 'online' }) => {
    if (item.type === 'offline') {
      if (isGoogleTranslateActive()) {
        resetGoogleTranslate();
      }
      setLanguage(item.code as LanguageCode);
      setCurrentOnlineLang(null);
      onClose();
    } else {
      setIsTranslating(true);
      setCurrentOnlineLang(item.code);
      translatePageTo(item.code);
      setTimeout(() => {
        setIsTranslating(false);
        onClose();
      }, 500);
    }
  };

  const handleResetToDefault = () => {
    resetGoogleTranslate();
    setCurrentOnlineLang(null);
    setLanguage('hi'); // Default app language or fallback
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('language.title') || 'Language / भाषा चुनें'}
      maxWidth="lg"
    >
      <div className="space-y-3.5 text-left">
        {/* Active translation banner if Google Translate or custom language is applied */}
        {googleActive && (
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-[var(--text)] truncate">
                Google Translate active ({currentOnlineLang?.toUpperCase()})
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-2.5 py-1 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--accent)] font-semibold flex items-center gap-1.5 shrink-0 border border-[var(--border)] cursor-pointer text-xs transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset / मूल भाषा</span>
            </button>
          </div>
        )}

        {/* Clean, Professional Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search language / भाषा खोजें (e.g. Hindi, English, Urdu, Tamil, French)..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-xs sm:text-sm placeholder:text-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Clean Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs'
                : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]'
            }`}
          >
            All Languages ({allLanguageItems.combined.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('offline')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer ${
              filterMode === 'offline'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs'
                : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]'
            }`}
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>Built-in Instant ({allLanguageItems.offlineList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('online')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer ${
              filterMode === 'online'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs'
                : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]'
            }`}
          >
            <Globe className="w-3 h-3 text-sky-400" />
            <span>Google Translate (100+)</span>
          </button>
        </div>

        {/* Languages Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto pr-1">
          {filteredLanguages.map((item) => {
            const isSelected =
              item.type === 'offline'
                ? !googleActive && language === item.code
                : currentOnlineLang === item.code;

            return (
              <button
                key={`${item.type}-${item.code}`}
                type="button"
                onClick={() => handleSelectLanguage(item)}
                disabled={isTranslating}
                className={`p-2.5 rounded-xl border text-left transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer active:scale-97 select-none ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--surface-2)] ring-1.5 ring-[var(--accent)] font-semibold shadow-xs'
                    : 'border-[var(--border)] bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] hover:border-[var(--accent)]/40'
                }`}
              >
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="text-sm font-bold text-[var(--text)] truncate leading-tight">
                    {item.nativeName}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-[var(--text-muted)] truncate">
                      {item.name}
                    </span>
                    {item.isRTL && (
                      <span className="text-[9px] px-1 rounded bg-[var(--surface)] text-[var(--text-muted)] font-mono">
                        RTL
                      </span>
                    )}
                  </div>
                  <span className="mt-1 text-[9px] font-medium tracking-wide">
                    {item.type === 'offline' ? (
                      <span className="text-emerald-400 font-semibold">Instant Offline</span>
                    ) : (
                      <span className="text-sky-400">Google Online</span>
                    )}
                  </span>
                </div>

                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-[var(--border)] shrink-0 opacity-20" />
                )}
              </button>
            );
          })}

          {filteredLanguages.length === 0 && (
            <div className="col-span-full py-10 text-center space-y-1">
              <p className="text-xs text-[var(--text-muted)]">
                No languages found matching &ldquo;{searchQuery}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-[var(--accent)] hover:underline font-semibold"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            16 Built-in languages work 100% offline
          </span>
          <span className="font-mono text-[10px]">100+ Total Languages</span>
        </div>
      </div>
    </Modal>
  );
};
