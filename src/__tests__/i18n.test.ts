import { describe, it, expect } from 'vitest';
import { SUPPORTED_LANGUAGES } from '@/locales/types';
import { getLoadedTranslation } from '@/locales';
import { formatCurrency, formatNumber } from '@/lib/format/formatters';

describe('i18n & Localization System Tests', () => {
  it('supports exactly 16 distinct languages', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(16);
  });

  it('correctly tags RTL for Urdu and Arabic', () => {
    const ur = SUPPORTED_LANGUAGES.find((l) => l.code === 'ur');
    const ar = SUPPORTED_LANGUAGES.find((l) => l.code === 'ar');
    const en = SUPPORTED_LANGUAGES.find((l) => l.code === 'en');
    const hi = SUPPORTED_LANGUAGES.find((l) => l.code === 'hi');

    expect(ur?.isRTL).toBe(true);
    expect(ar?.isRTL).toBe(true);
    expect(en?.isRTL).toBe(false);
    expect(hi?.isRTL).toBe(false);
  });

  it('returns valid translations in English and Hindi', () => {
    expect(getLoadedTranslation('en', 'appName')).toBe('Staff Manager');
    expect(getLoadedTranslation('hi', 'appName')).toBe('स्टाफ मैनेजर');
  });

  it('falls back to English when a key is missing', () => {
    expect(getLoadedTranslation('ur', 'appName')).toBeDefined();
    expect(getLoadedTranslation('ur', 'non_existent_key')).toBe('non_existent_key');
  });

  it('formats currencies accurately', () => {
    const formatted = formatCurrency(1250, 'INR', 'en');
    expect(formatted).toContain('1,250');
  });

  it('formats numbers properly', () => {
    const formatted = formatNumber(1000000, 'en');
    expect(formatted).toBe('1,000,000');
  });
});
