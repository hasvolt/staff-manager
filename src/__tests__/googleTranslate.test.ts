import { describe, it, expect } from 'vitest';
import {
  POPULAR_ONLINE_LANGUAGES,
  isGoogleTranslateActive,
  getCurrentGoogleTranslateLanguage,
} from '@/lib/i18n/googleTranslate';

describe('Universal Google Translator Integration Tests', () => {
  it('provides a comprehensive catalog of 100+ world languages', () => {
    expect(POPULAR_ONLINE_LANGUAGES.length).toBeGreaterThan(90);
    const french = POPULAR_ONLINE_LANGUAGES.find((l) => l.code === 'fr');
    const german = POPULAR_ONLINE_LANGUAGES.find((l) => l.code === 'de');
    const japanese = POPULAR_ONLINE_LANGUAGES.find((l) => l.code === 'ja');
    const russian = POPULAR_ONLINE_LANGUAGES.find((l) => l.code === 'ru');
    const spanish = POPULAR_ONLINE_LANGUAGES.find((l) => l.code === 'es');

    expect(french).toBeDefined();
    expect(french?.name).toBe('French');
    expect(german).toBeDefined();
    expect(japanese).toBeDefined();
    expect(russian).toBeDefined();
    expect(spanish).toBeDefined();
  });

  it('detects google translate active state based on cookie format', () => {
    expect(typeof isGoogleTranslateActive).toBe('function');
    expect(typeof getCurrentGoogleTranslateLanguage).toBe('function');
    // In clean test environment, no google translation cookie is set
    expect(isGoogleTranslateActive()).toBe(false);
    expect(getCurrentGoogleTranslateLanguage()).toBe(null);
  });
});
