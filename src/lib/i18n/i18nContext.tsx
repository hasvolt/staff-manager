import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import {
  LanguageCode,
  LanguageMeta,
  SUPPORTED_LANGUAGES,
  Translations,
} from '@/locales/types';
import { getLoadedTranslation, loadLanguage } from '@/locales';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format/formatters';

interface I18nContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  isRTL: boolean;
  languages: LanguageMeta[];
  currency: string;
  setCurrency: (c: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
}

const I18N_STORAGE_KEY = 'staff_manager_language';
const CURRENCY_STORAGE_KEY = 'staff_manager_currency';

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(I18N_STORAGE_KEY) as LanguageCode;
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        return saved;
      }
    }
    return 'en';
  });

  const [currency, setCurrencyState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CURRENCY_STORAGE_KEY) || 'INR';
    }
    return 'INR';
  });

  const [, startTransition] = useTransition();
  const [, setVersion] = useState(0);

  const activeMeta = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  const isRTL = activeMeta.isRTL;

  useEffect(() => {
    let isMounted = true;
    loadLanguage(language).then(() => {
      if (isMounted) {
        startTransition(() => {
          setVersion((v) => v + 1);
        });
      }
    });

    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
    localStorage.setItem('staff_manager_dir', isRTL ? 'rtl' : 'ltr');

    return () => {
      isMounted = false;
    };
  }, [language, isRTL]);

  const setLanguage = (newLang: LanguageCode) => {
    setLanguageState(newLang);
    localStorage.setItem(I18N_STORAGE_KEY, newLang);
  };

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    return getLoadedTranslation(language, key, params);
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        isRTL,
        languages: SUPPORTED_LANGUAGES,
        currency,
        setCurrency,
        t,
        formatCurrency: (amt: number) => formatCurrency(amt, currency, language),
        formatDate: (d, opts) => formatDate(d, language, opts),
        formatNumber: (n, opts) => formatNumber(n, language, opts),
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
