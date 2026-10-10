import { calendarDate } from '../i18n/format.ts';

export function isSelectableDate(value: string, minDate?: string, maxDate?: string): boolean {
  try { calendarDate(value); } catch { return false; }
  return (!minDate || value >= minDate) && (!maxDate || value <= maxDate);
}

export function monthStart(value: string): string {
  calendarDate(value);
  return `${value.slice(0, 7)}-01`;
}

export function shiftMonth(value: string, offset: number): string {
  const date = calendarDate(monthStart(value));
  date.setUTCMonth(date.getUTCMonth() + offset);
  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return monthStart(value);
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export function calendarWeeks(month: string): (string | null)[][] {
  const first = monthStart(month);
  const date = calendarDate(first);
  const next = calendarDate(first);
  next.setUTCMonth(next.getUTCMonth() + 1);
  next.setUTCDate(0);
  const cells: (string | null)[] = Array.from({ length: date.getUTCDay() }, () => null);
  for (let day = 1; day <= next.getUTCDate(); day++) cells.push(`${first.slice(0, 7)}-${String(day).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}
