import type { ContentLanguage } from '../models/place.ts';
export const locales: Record<ContentLanguage, string> = { ko: 'ko-KR', en: 'en-US' };
export function initialLanguage(languageTag?: string | null): ContentLanguage {
  return languageTag?.toLowerCase().split(/[-_]/)[0] === 'ko' ? 'ko' : 'en';
}
export function formatNumber(value: number, language: ContentLanguage, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locales[language], options).format(value);
}
export function calendarDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError('Invalid calendar date');
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new RangeError('Invalid calendar date');
  return date;
}
export function formatDate(value: string, language: ContentLanguage, options: Omit<Intl.DateTimeFormatOptions, 'timeZone'> = { dateStyle: 'long' }) {
  return new Intl.DateTimeFormat(locales[language], { ...options, timeZone: 'UTC' }).format(calendarDate(value));
}
export function formatTimestamp(value: Date | number, language: ContentLanguage, options: Omit<Intl.DateTimeFormatOptions, 'timeZone'> = { dateStyle: 'medium', timeStyle: 'short' }) {
  return new Intl.DateTimeFormat(locales[language], { ...options, timeZone: 'Asia/Seoul' }).format(value);
}
