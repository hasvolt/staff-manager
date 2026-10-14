import { applyFullAppTranslation, returnToEnglish } from './fullAppTranslator';

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement?: new (
          options: {
            pageLanguage?: string;
            includedLanguages?: string;
            layout?: number;
            autoDisplay?: boolean;
            multilanguagePage?: boolean;
          },
          elementId: string
        ) => void;
        InlineLayout?: {
          SIMPLE: number;
          HORIZONTAL: number;
          VERTICAL: number;
        };
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

// Full comprehensive list of Google Translate supported languages
export interface OnlineLanguageOption {
  code: string;
  name: string;
  nativeName?: string;
}

export const POPULAR_ONLINE_LANGUAGES: OnlineLanguageOption[] = [
  // Major Indian Languages
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्' },

  // World Languages
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski' },
  { code: 'my', name: 'Burmese (Myanmar)', nativeName: 'မြန်မာ' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano' },
  { code: 'fil', name: 'Filipino (Tagalog)', nativeName: 'Filipino' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული' },
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge' },
  { code: 'jv', name: 'Javanese', nativeName: 'Jawa' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ' },
  { code: 'ku', name: 'Kurdish', nativeName: 'Kurdî' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
  { code: 'la', name: 'Latin', nativeName: 'Latina' },
  { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංহල' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ' },
  { code: 'tt', name: 'Tatar', nativeName: 'Татарча' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmençe' },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbekcha' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa' },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu' },
];

let scriptLoaded = false;
let scriptLoading = false;
const listeners: Array<() => void> = [];

/**
 * Permanently suppress Google Translate top banner, popup frames, and body push.
 */
export function suppressGoogleTranslateBanner(): void {
  if (typeof document === 'undefined') return;

  // 1. Lock html & body style: zero top displacement
  if (document.body) {
    if (document.body.style.top !== '0px') {
      document.body.style.setProperty('top', '0px', 'important');
    }
    if (document.body.style.position !== 'static') {
      document.body.style.setProperty('position', 'static', 'important');
    }
    if (document.body.classList.contains('goog-te-banner-frame')) {
      document.body.classList.remove('goog-te-banner-frame');
    }
  }

  if (document.documentElement) {
    if (document.documentElement.style.top !== '0px') {
      document.documentElement.style.setProperty('top', '0px', 'important');
    }
  }

  // 2. Hide all banner frames, skiptranslate divs, and tooltips
  const elementsToHide = document.querySelectorAll(
    'body > .skiptranslate, div.skiptranslate:not(#google_translate_element), .goog-te-banner-frame, iframe.goog-te-banner-frame, iframe.skiptranslate, #goog-gt-tt, #goog-gt-vt, .goog-te-balloon-frame, .goog-tooltip'
  );
  elementsToHide.forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.setProperty('display', 'none', 'important');
    htmlEl.style.setProperty('visibility', 'hidden', 'important');
    htmlEl.style.setProperty('height', '0px', 'important');
    htmlEl.style.setProperty('max-height', '0px', 'important');
    htmlEl.style.setProperty('width', '0px', 'important');
    htmlEl.style.setProperty('overflow', 'hidden', 'important');
    htmlEl.style.setProperty('pointer-events', 'none', 'important');
    htmlEl.style.setProperty('z-index', '-9999', 'important');
  });
}

// Start continuous banner suppression observer if in browser
if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
  try {
    const observer = new MutationObserver(() => {
      suppressGoogleTranslateBanner();
    });
    if (document.documentElement) {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        childList: true,
        subtree: true,
      });
    }
  } catch {}
}

export function isGoogleTranslateActive(): boolean {
  if (typeof document === 'undefined') return false;
  const cookieMatch = document.cookie.match(/(?:^|; )googtrans=([^;]*)/);
  if (cookieMatch) {
    const val = decodeURIComponent(cookieMatch[1]);
    if (val && val !== '/auto/en' && val !== '/en/en' && val !== '') {
      return true;
    }
  }
  try {
    const saved = localStorage.getItem('staff_manager_google_lang');
    if (saved && saved !== 'en') return true;
  } catch {}
  return false;
}

export function getCurrentGoogleTranslateLanguage(): string | null {
  if (typeof document === 'undefined') return null;
  const cookieMatch = document.cookie.match(/(?:^|; )googtrans=([^;]*)/);
  if (cookieMatch) {
    const val = decodeURIComponent(cookieMatch[1]);
    const parts = val.split('/');
    const lang = parts[parts.length - 1];
    if (lang && lang !== 'en' && lang !== 'auto') {
      return lang;
    }
  }
  try {
    const saved = localStorage.getItem('staff_manager_google_lang');
    if (saved && saved !== 'en') return saved;
  } catch {}
  return null;
}

export function loadGoogleTranslateScript(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    if (window.google?.translate) {
      resolve();
      return;
    }

    if (scriptLoaded) {
      resolve();
      return;
    }

    listeners.push(resolve);

    if (scriptLoading) {
      return;
    }

    scriptLoading = true;

    // Define the global callback
    window.googleTranslateElementInit = () => {
      try {
        if (window.google?.translate?.TranslateElement) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: 'en',
              autoDisplay: false,
              multilanguagePage: true,
            },
            'google_translate_element'
          );
        }
      } catch (err) {
        console.warn('Google Translate init note:', err);
      }

      suppressGoogleTranslateBanner();
      scriptLoaded = true;
      scriptLoading = false;

      // Check if there was an active translation requested
      const activeLang = getCurrentGoogleTranslateLanguage();
      if (activeLang && activeLang !== 'en') {
        setTimeout(() => {
          applyComboLanguage(activeLang);
        }, 100);
      }

      while (listeners.length > 0) {
        const cb = listeners.shift();
        if (cb) cb();
      }
    };

    // If script is already in document
    const existingScript = document.querySelector('script[src*="translate.google.com"]');
    if (existingScript) {
      scriptLoaded = true;
      scriptLoading = false;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.warn('Google Translate script could not load (e.g. offline or blocked).');
      scriptLoading = false;
    };
    document.body.appendChild(script);
  });
}

/**
 * Apply target language to .goog-te-combo
 */
function applyComboLanguage(targetLang: string): boolean {
  const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
  if (select) {
    select.value = targetLang;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('input', { bubbles: true }));
    suppressGoogleTranslateBanner();
    return true;
  }
  return false;
}

/**
 * Trigger full app translation to a given target language code via Google Translate cookie & combo.
 */
export function translatePageTo(targetLang: string): void {
  if (typeof document === 'undefined') return;

  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();

  // Set Google Translate standard cookies on root path
  document.cookie = `googtrans=/en/${targetLang}; expires=${expires}; path=/; SameSite=Lax`;
  document.cookie = `googtrans=/auto/${targetLang}; expires=${expires}; path=/; SameSite=Lax`;

  try {
    localStorage.setItem('staff_manager_google_lang', targetLang);
  } catch {}

  // Suppress top banner immediately
  suppressGoogleTranslateBanner();

  // Apply instant client-side full app translation
  setTimeout(() => {
    applyFullAppTranslation(targetLang);
  }, 20);

  // Try applying directly to combo
  if (applyComboLanguage(targetLang)) {
    return;
  }

  // If combo not ready yet, load script and poll
  loadGoogleTranslateScript().then(() => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (applyComboLanguage(targetLang) || attempts > 40) {
        clearInterval(interval);
        suppressGoogleTranslateBanner();
      }
    }, 75);
  });
}

/**
 * Reset Google Translate back to native app text
 */
export function resetGoogleTranslate(): void {
  if (typeof document === 'undefined') return;

  // Clear cookies
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = 'googtrans=/en/en; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = 'googtrans=/auto/en; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

  try {
    localStorage.removeItem('staff_manager_google_lang');
  } catch {}

  // Revert all DOM nodes back to English
  returnToEnglish();

  const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
  if (select) {
    select.value = 'en';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  suppressGoogleTranslateBanner();

  // Reload to restore original un-translated DOM nodes if needed
  setTimeout(() => {
    window.location.reload();
  }, 100);
}
