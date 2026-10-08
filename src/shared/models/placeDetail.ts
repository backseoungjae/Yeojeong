import type { ContentLanguage, Place, TourService } from './place.ts';
import { TourError } from '../api/tour/tourError.ts';
export interface PlaceIdentifier { id: string; service: TourService; language: ContentLanguage; contentId: string }
export function parsePlaceIdentifier(value: string): PlaceIdentifier {
  const match = /^tourapi:(KorService2|EngService2):(\d{1,30})$/.exec(value);
  if (!match) throw new TourError('parameters');
  const service = match[1] === 'KorService2' ? 'KorService2' : 'EngService2';
  return { id: value, service, language: service === 'KorService2' ? 'ko' : 'en', contentId: match[2] };
}
export type PlaceInfoKey = 'hours' | 'closed' | 'fees' | 'parking' | 'parkingFees' | 'contact' | 'reservation' | 'menu' | 'otherMenu' | 'experience' | 'season' | 'duration' | 'capacity' | 'size' | 'discount';
export interface PlaceInfo { key: PlaceInfoKey; value: string; phoneUrl?: string }
export interface PlaceDetail { place: Place; description?: string; address?: string; telephone?: string; phoneUrl?: string; websiteUrl?: string; modifiedDate?: string }
export interface PlacePhoto { id: string; sourceUrl?: string; url?: string; thumbnailUrl?: string; name?: string; license?: string }
