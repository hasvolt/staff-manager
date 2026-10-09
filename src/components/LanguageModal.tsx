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
import { Check, Globe, Search, Sparkles, RotateCcw, Wifi, WifiOff } from 'lucide-react';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage, languages, t } = useI18n();
  const [activeTab, setActiveTab] = useState<'offline' | 'online'>('offline');
  const [onlineSearch, setOnlineSearch] = useState('');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [currentOnlineLang, setCurrentOnlineLang] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (isOpen) {
      setCurrentOnlineLang(getCurrentGoogleTranslateLanguage());
      // Pre-warm Google Translate script when modal opens
      loadGoogleTranslateScript().catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOpen]);

  const filteredOnlineLanguages = useMemo(() => {
    if (!onlineSearch.trim()) return POPULAR_ONLINE_LANGUAGES;
    const query = onlineSearch.toLowerCase().trim();
    return POPULAR_ONLINE_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(query) ||
        (l.nativeName && l.nativeName.toLowerCase().includes(query)) ||
        l.code.toLowerCase().includes(query)
    );
  }, [onlineSearch]);

  const handleSelectOfflineLang = (code: LanguageCode) => {
    // If Google Translate was active, clear it first
    if (isGoogleTranslateActive()) {
      resetGoogleTranslate();
    }
    setLanguage(code);
    onClose();
  };

  const handleSelectOnlineLang = (code: string) => {
    setIsTranslating(true);
    setCurrentOnlineLang(code);
    translatePageTo(code);
    setTimeout(() => {
      setIsTranslating(false);
      onClose();
    }, 600);
  };

  const handleResetTranslation = () => {
    resetGoogleTranslate();
    setCurrentOnlineLang(null);
    onClose();
  };

  const googleActive = isGoogleTranslateActive();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('language.title')}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Mode Switch Tabs: Offline Native (16) vs Google Translate Online (100+) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setActiveTab('offline')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'offline'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>Built-in Offline (16)</span>
            <span className="text-[10px] opacity-80 px-1.5 py-0.2 bg-black/20 rounded-full font-mono">Fast</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('online')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'online'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Google Translator (Online)</span>
            <span className="text-[10px] opacity-80 px-1.5 py-0.2 bg-black/20 rounded-full font-mono">100+</span>
          </button>
        </div>

        {/* Tab 1: Offline Native Built-in Languages (Zero data required, instant) */}
        {activeTab === 'offline' && (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                Works 100% offline without internet connection
              </span>
              {googleActive && (
                <button
                  type="button"
                  onClick={handleResetTranslation}
                  className="text-xs text-[var(--accent)] flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Google Translate
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto p-1">
              {languages.map((lang) => {
                const isSelected = !googleActive && language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectOfflineLang(lang.code as LanguageCode)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer active:scale-97 ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--surface-2)] ring-1 ring-[var(--accent)] font-semibold'
                        : 'border-[var(--border)] bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-1.5">
                      <span className="text-sm text-[var(--text)] font-medium leading-tight truncate">
                        {lang.nativeName}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
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
          </div>
        )}

        {/* Tab 2: Universal Google Translator (Online 100+ languages) */}
        {activeTab === 'online' && (
          <div className="space-y-3">
            {/* Online Status Info Banner */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span className="text-[var(--text)]">
                  <strong>Universal Google Translator:</strong> Translate the entire app into any world language online.
                </span>
              </div>
              {googleActive && (
                <button
                  type="button"
                  onClick={handleResetTranslation}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--surface)] text-[var(--accent)] hover:bg-[var(--border)] transition text-xs font-medium cursor-pointer shrink-0 ml-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to Original</span>
                </button>
              )}
            </div>

            {!isOnline && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs">
                <Wifi className="w-4 h-4 shrink-0" />
                <span>You appear to be offline. Online Google translation requires internet access. Use the built-in offline languages above.</span>
              </div>
            )}

            {/* Search Input for 100+ World Languages */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={onlineSearch}
                onChange={(e) => setOnlineSearch(e.target.value)}
                placeholder="Search any world language (e.g. Russian, French, German, Japanese, Sindhi)..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-xs placeholder:text-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Language Selection Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[46vh] overflow-y-auto p-1">
              {filteredOnlineLanguages.map((lang) => {
                const isSelected = currentOnlineLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectOnlineLang(lang.code)}
                    disabled={isTranslating}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer active:scale-97 ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--surface-2)] ring-1 ring-[var(--accent)] font-semibold'
                        : 'border-[var(--border)] bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-1.5">
                      <span className="text-sm text-[var(--text)] font-medium leading-tight truncate">
                        {lang.nativeName || lang.name}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                        {lang.name}
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

              {filteredOnlineLanguages.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-[var(--text-muted)]">
                  No languages matched &quot;{onlineSearch}&quot;
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
