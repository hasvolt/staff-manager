import { LanguageCode } from '@/locales/types';

export function formatCurrency(
  amount: number,
  currency: string = 'INR',
  locale: LanguageCode = 'en'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatNumber(
  num: number,
  locale: LanguageCode = 'en',
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(num);
  } catch {
    return num.toString();
  }
}

export function formatDate(
  date: Date | string | number,
  locale: LanguageCode = 'en',
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, options).format(d);
  } catch {
    return String(date);
  }
}

export function formatRelativeTime(
  timestamp: Date | string | number,
  locale: LanguageCode = 'en'
): string {
  try {
    const now = Date.now();
    const then = typeof timestamp === 'string' || typeof timestamp === 'number' ? new Date(timestamp).getTime() : timestamp.getTime();
    const diffSec = Math.floor((then - now) / 1000);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
    const diffMin = Math.floor(diffSec / 60);
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
    const diffHours = Math.floor(diffMin / 60);
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
    const diffDays = Math.floor(diffHours / 24);
    return rtf.format(diffDays, 'day');
  } catch {
    return formatDate(timestamp, locale);
  }
}
