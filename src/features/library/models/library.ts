import type { Place } from '../../../shared/models/place.ts';
export interface StoredPlace { place: Place; capturedAt: number; recordedAt: number }
export interface RecentSearch { keyword: string; searchedAt: number }
export interface LibraryData { saved: StoredPlace[]; recent: StoredPlace[]; searches: RecentSearch[] }
export const emptyLibrary: LibraryData = { saved: [], recent: [], searches: [] };
export { parseSnapshot, serializeSnapshot } from '../../../shared/models/placeSnapshot.ts';
