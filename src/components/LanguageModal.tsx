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
import { returnToEnglish } from '@/lib/i18n/fullAppTranslator';
import { Check, Globe, Search, Sparkles, RotateCcw, X, Zap, ArrowLeft, Languages } from 'lucide-react';

interface LanguageItem {
  code: string;
  name: string;
  nativeName: string;
  isRTL: boolean;
  type: 'offline' | 'online';
}

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage, languages, t } = useI18n();
  const [filterMode, setFilterMode] = useState<'offline' | 'online' | 'all'>('offline');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentOnlineLang, setCurrentOnlineLang] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentOnlineLang(getCurrentGoogleTranslateLanguage());
      loadGoogleTranslateScript().catch(() => {});
    }
  }, [isOpen]);

  const googleActive = isGoogleTranslateActive();
  const isEnglish = !googleActive && language === 'en';

  // Build items lists
  const allLanguageItems = useMemo(() => {
    // Built-in 16 Offline languages
    const offlineList: LanguageItem[] = languages.map((l) => ({
      code: l.code,
      name: l.name,
      nativeName: l.nativeName,
      isRTL: l.isRTL,
      type: 'offline' as const,
    }));

    // Online World languages (100+)
    const onlineList: LanguageItem[] = POPULAR_ONLINE_LANGUAGES.map((l) => ({
      code: l.code,
      name: l.name,
      nativeName: l.nativeName || l.name,
      isRTL: ['ar', 'ur', 'he', 'fa', 'ps', 'sd', 'ug', 'yi'].includes(l.code),
      type: 'online' as const,
    }));

    return { offlineList, onlineList, combined: [...offlineList, ...onlineList] };
  }, [languages]);

  const filteredLanguages = useMemo(() => {
    let list: LanguageItem[] = allLanguageItems.offlineList;
    if (filterMode === 'online') {
      list = allLanguageItems.onlineList;
    } else if (filterMode === 'all') {
      list = allLanguageItems.combined;
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

  // Handle switching to Offline language
  const handleSelectOffline = (code: string) => {
    if (code === 'en') {
      handleReturnToEnglish();
      return;
    }
    if (isGoogleTranslateActive()) {
      resetGoogleTranslate();
    }
    setLanguage(code as LanguageCode);
    setCurrentOnlineLang(null);
    setStatusMessage(`Offline language applied: ${code.toUpperCase()}`);
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 250);
  };

  // Handle switching to Online language
  const handleSelectOnline = (item: { code: string; name: string; nativeName: string }) => {
    if (item.code === 'en') {
      handleReturnToEnglish();
      return;
    }
    setStatusMessage(`Translating full app to ${item.nativeName} (${item.name})...`);
    setCurrentOnlineLang(item.code);
    translatePageTo(item.code);
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 400);
  };

  // Universal Return to English handler
  const handleReturnToEnglish = () => {
    resetGoogleTranslate();
    returnToEnglish();
    setLanguage('en');
    setCurrentOnlineLang(null);
    setStatusMessage('Language reset to English (मूल अंग्रेज़ी)');
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('language.title') || 'Select Language / भाषा चुनें'}
      maxWidth="lg"
    >
      <div className="space-y-3.5 text-left">
        {/* Prominent 'Return to English' Action Button */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Languages className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--text)] truncate">
              {isEnglish
                ? 'Current Language: English (Default)'
                : `Current: ${googleActive ? `${currentOnlineLang?.toUpperCase()} (Online)` : language.toUpperCase()}`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleReturnToEnglish}
            disabled={isEnglish}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0 ${
              isEnglish
                ? 'opacity-50 cursor-not-allowed bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
            }`}
            title="Reset app language back to English"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Return to English / मूल अंग्रेज़ी</span>
          </button>
        </div>

        {/* Transient Status notification */}
        {statusMessage && (
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs flex items-center gap-2 font-medium animate-pulse">
            <Globe className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Search Input Box */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search language / भाषा खोजें (Hindi, Urdu, বাংলা, தமிழ், French, Arabic)..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-xs sm:text-sm placeholder:text-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Distinct Separation: Offline vs Online Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
          {/* Tab 1: Offline 16 */}
          <button
            type="button"
            onClick={() => setFilterMode('offline')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              filterMode === 'offline'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Offline (16 Native)</span>
          </button>

          {/* Tab 2: Online 100+ */}
          <button
            type="button"
            onClick={() => setFilterMode('online')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              filterMode === 'online'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">Online (100+ World)</span>
          </button>

          {/* Tab 3: All Languages */}
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <span className="truncate">All Languages</span>
          </button>
        </div>

        {/* Section description */}
        <div className="px-1 text-[11px] text-[var(--text-muted)] flex items-center justify-between">
          <span>
            {filterMode === 'offline' && '⚡ 16 Native languages work 100% offline without internet.'}
            {filterMode === 'online' && '🌐 100+ World languages translated online.'}
            {filterMode === 'all' && 'Showing all available offline & online languages.'}
          </span>
          <span className="font-mono text-[10px]">{filteredLanguages.length} languages</span>
        </div>

        {/* Languages Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto pr-1">
          {filteredLanguages.map((item) => {
            const isSelected =
              item.type === 'offline'
                ? !googleActive && language === item.code
                : googleActive && currentOnlineLang === item.code;

            return (
              <button
                key={`${item.type}-${item.code}`}
                type="button"
                onClick={() => {
                  if (item.type === 'offline') {
                    handleSelectOffline(item.code);
                  } else {
                    handleSelectOnline(item);
                  }
                }}
                className={`p-2.5 rounded-xl border text-left transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer active:scale-97 select-none ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--surface-2)] ring-2 ring-[var(--accent)] font-semibold shadow-xs'
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
                      <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5" /> Offline
                      </span>
                    ) : (
                      <span className="text-sky-400 flex items-center gap-0.5">
                        <Globe className="w-2.5 h-2.5" /> Online
                      </span>
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
                className="text-xs text-[var(--accent)] hover:underline font-semibold cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            16 Built-in languages work 100% offline
          </span>
          <button
            type="button"
            onClick={handleReturnToEnglish}
            className="text-[var(--accent)] font-semibold hover:underline text-xs cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to English</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
