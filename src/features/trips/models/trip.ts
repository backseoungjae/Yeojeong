import type { Place } from '../../../shared/models/place.ts';
import { RepositoryError } from '../../../shared/database/database.ts';
export interface TripInput { name: string; startDate: string; endDate: string }
export interface Trip extends TripInput { id: string; createdAt: number; updatedAt: number; revision: number }
export interface ItineraryItem { id: string; tripId: string; date: string; position: number; memo: string; place: Place; capturedAt: number }
export interface TripData { trips: Trip[]; items: ItineraryItem[] }
export type ItemResolution = { action: 'delete' } | { action: 'move'; date: string };
export type PeriodResolutions = Readonly<Record<string, ItemResolution>>;
export type TripStatus = 'ongoing' | 'upcoming' | 'past';
export class TripError extends RepositoryError {
  readonly kind: 'name' | 'date' | 'period' | 'outside' | 'duplicate' | 'conflict' | 'missing' | 'storage';
  constructor(kind: TripError['kind']) { super(`Trip: ${kind}`); this.name = 'TripError'; this.kind = kind; }
}
