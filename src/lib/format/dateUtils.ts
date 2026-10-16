/**
 * Timezone-aware date utilities for Staff Manager.
 *
 * FIX FOR AUDIT H1:
 * Never use `new Date().toISOString().split('T')[0]` or `.slice(0, 10)` for local calendar dates!
 * `toISOString()` converts to UTC, shifting dates backward for timezones east of UTC
 * (like Asia/Kolkata UTC+5:30) and forward for timezones west of UTC.
 */

/**
 * Format a Date object as YYYY-MM-DD in the user's LOCAL timezone.
 */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string into a local Date object (at 00:00:00 local time).
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = parts[1] ? parts[1] - 1 : 0;
  const day = parts[2] || 1;
  return new Date(year, month, day);
}

/**
 * Get today's date string in local timezone (YYYY-MM-DD).
 */
export function getTodayDateString(): string {
  return formatLocalDate(new Date());
}

/**
 * Get yesterday's date string in local timezone (YYYY-MM-DD).
 */
export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

/**
 * Get start of current month (YYYY-MM-01) in local timezone.
 */
export function getStartOfMonthDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Get end of month (last calendar day of the month) in local timezone.
 */
export function getEndOfMonthDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthStr = String(month + 1).padStart(2, '0');
  const dayStr = String(lastDay).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
}

/**
 * Get start and end of previous calendar month in local timezone.
 */
export function getLastMonthDateRange(now: Date = new Date()): { start: string; end: string } {
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    start: getStartOfMonthDateString(lastMonthDate),
    end: getEndOfMonthDateString(lastMonthDate),
  };
}

/**
 * Get start and end for last N months (e.g. 3 months: from 1st of 2 months ago to end of current month).
 */
export function getLastNMonthsDateRange(months: number = 3, now: Date = new Date()): { start: string; end: string } {
  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  return {
    start: getStartOfMonthDateString(startDate),
    end: getEndOfMonthDateString(now),
  };
}

/**
 * Get year-to-date range (from Jan 1 of this year to end of current month).
 */
export function getYearToDateRange(now: Date = new Date()): { start: string; end: string } {
  const year = now.getFullYear();
  return {
    start: `${year}-01-01`,
    end: getEndOfMonthDateString(now),
  };
}
