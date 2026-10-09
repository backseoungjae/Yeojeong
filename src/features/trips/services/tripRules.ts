import { calendarDate } from '../../../shared/i18n/format.ts';
import { TripError, type ItineraryItem, type PeriodResolutions, type TripInput, type TripStatus } from '../models/trip.ts';
export function validateDate(value: string): string {
  try { calendarDate(value); return value; } catch { throw new TripError('date'); }
}
export function validateTrip(input: TripInput): TripInput {
  const name = input.name.trim();
  if (!name) throw new TripError('name');
  const startDate = validateDate(input.startDate), endDate = validateDate(input.endDate);
  if (endDate < startDate) throw new TripError('period');
  return { name, startDate, endDate };
}
export function seoulToday(now: number = Date.now()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const field = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return validateDate(`${field('year').padStart(4, '0')}-${field('month')}-${field('day')}`);
}
export function tripStatus(trip: Pick<TripInput, 'startDate' | 'endDate'>, today = seoulToday()): TripStatus {
  return today < trip.startDate ? 'upcoming' : today > trip.endDate ? 'past' : 'ongoing';
}
export function dayNumber(startDate: string, date: string): number {
  return Math.round((calendarDate(date).getTime() - calendarDate(startDate).getTime()) / 86400000) + 1;
}
export function shiftDate(value: string, days: number): string {
  const date = calendarDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return validateDate(`${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`);
}
export function outsidePeriod(items: ItineraryItem[], input: TripInput) {
  return items.filter(item => item.date < input.startDate || item.date > input.endDate);
}
export function planPeriodChange(items: ItineraryItem[], input: TripInput, resolutions: PeriodResolutions = {}): ItineraryItem[] {
  validateTrip(input);
  const affected = outsidePeriod(items, input);
  if (affected.some(item => !resolutions[item.id])) throw new TripError('outside');
  if (Object.keys(resolutions).some(id => !affected.some(item => item.id === id))) throw new TripError('conflict');
  const retained = items.filter(item => !affected.includes(item));
  const moved = affected.flatMap(item => {
    const resolution = resolutions[item.id];
    if (resolution.action === 'delete') return [];
    const date = validateDate(resolution.date);
    if (date < input.startDate || date > input.endDate) throw new TripError('outside');
    return [{ ...item, date }];
  });
  const seen = new Set<string>(), positions = new Map<string, number>();
  // 날짜를 유지한 항목을 먼저 두고, 이동 항목은 기존 방문 순서대로 대상 날짜의 끝에 추가한다.
  return [...retained, ...moved].sort((a, b) => a.date.localeCompare(b.date)).map(item => {
    const key = `${item.date}:${item.place.id}`;
    if (seen.has(key)) throw new TripError('duplicate');
    seen.add(key);
    const position = positions.get(item.date) ?? 0; positions.set(item.date, position + 1);
    return { ...item, position };
  });
}
