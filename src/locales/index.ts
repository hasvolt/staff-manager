import { en } from './en';
import { hi } from './hi';
import { ur } from './ur';
import { LanguageCode, Translations } from './types';

export * from './types';

// Pre-bundled core languages for immediate startup, other languages lazy loaded dynamically
const bundledLocales: Record<'en' | 'hi' | 'ur', Translations> = { en, hi, ur };

const localeLoaders: Record<LanguageCode, () => Promise<{ default?: Translations; [key: string]: any }>> = {
  en: async () => ({ default: en }),
  hi: async () => ({ default: hi }),
  ur: async () => ({ default: ur }),
  bn: () => import('./bn'),
  mr: () => import('./mr'),
  gu: () => import('./gu'),
  pa: () => import('./pa'),
  ta: () => import('./ta'),
  te: () => import('./te'),
  kn: () => import('./kn'),
  ml: () => import('./ml'),
  or: () => import('./or'),
  as: () => import('./as'),
  ne: () => import('./ne'),
  ar: () => import('./ar'),
  es: () => import('./es'),
};

const loadedLocales: Record<string, Translations> = {
  en,
  hi,
  ur,
};

export async function loadLanguage(code: LanguageCode): Promise<Translations> {
  if (loadedLocales[code]) {
    return loadedLocales[code];
  }
  try {
    const module = await localeLoaders[code]();
    const dictionary = module[code] || module.default || en;
    loadedLocales[code] = dictionary;
    return dictionary;
  } catch (error) {
    console.warn(`Failed to load language "${code}", falling back to English:`, error);
    return en;
  }
}

export function getLoadedTranslation(code: LanguageCode, key: string, params?: Record<string, string | number>): string {
  const currentDict = loadedLocales[code] || en;
  let text = currentDict[key] ?? en[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(value));
    });
  }
  return text;
}
