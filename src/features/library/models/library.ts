import type { Place, PlaceType } from '../../../shared/models/place.ts';
import { parsePlaceIdentifier } from '../../../shared/models/placeDetail.ts';
import { StorageError } from '../../../shared/database/database.ts';
export interface StoredPlace { place: Place; capturedAt: number; recordedAt: number }
export interface RecentSearch { keyword: string; searchedAt: number }
export interface LibraryData { saved: StoredPlace[]; recent: StoredPlace[]; searches: RecentSearch[] }
export const emptyLibrary: LibraryData = { saved: [], recent: [], searches: [] };
const optionalFields = ['address','regionCode','districtCode','classification','subClassification','detailClassification','imageUrl','listImageUrl','imageSourceUrl','imageLicense','modifiedAt'] as const;
export function parseSnapshot(value: unknown): Place {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new StorageError('data');
  const fields = Object.fromEntries(Object.entries(value));
  if (typeof fields.id !== 'string' || typeof fields.name !== 'string' || !fields.name.trim() || typeof fields.providerTypeCode !== 'string' || !fields.providerTypeCode.trim()) throw new StorageError('data');
  let identity;
  try { identity = parsePlaceIdentifier(fields.id); } catch { throw new StorageError('data'); }
  if (fields.service !== identity.service || fields.contentId !== identity.contentId || fields.language !== identity.language || fields.source !== '한국관광공사 TourAPI') throw new StorageError('data');
  let type: PlaceType;
  if (fields.type === 'attraction' || fields.type === 'culture' || fields.type === 'restaurant' || fields.type === 'other') type = fields.type;
  else throw new StorageError('data');
  const result: Place = { ...identity, name: fields.name, providerTypeCode: fields.providerTypeCode, type, source: '한국관광공사 TourAPI' };
  for (const field of optionalFields) {
    if (fields[field] !== undefined && typeof fields[field] !== 'string') throw new StorageError('data');
    const text = fields[field]; if (typeof text === 'string' && text.trim()) result[field] = text;
  }
  for (const field of ['latitude','longitude'] as const) {
    const number = fields[field];
    if (number !== undefined && (typeof number !== 'number' || !Number.isFinite(number) || Math.abs(number) > (field === 'latitude' ? 90 : 180))) throw new StorageError('data');
    if (typeof number === 'number') result[field] = number;
  }
  return result;
}
export function serializeSnapshot(place: Place): string { return JSON.stringify(parseSnapshot(place)); }
