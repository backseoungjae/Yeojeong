import type { ContentLanguage, PlaceType } from '../../../shared/models/place.ts';
import { services } from '../../../shared/api/tour/tourConfig.ts';
import { TourError } from '../../../shared/api/tour/tourError.ts';
export type ExploreType = Exclude<PlaceType, 'other'> | 'all';
export interface ExploreConditions { keyword: string; regionCode?: string; districtCode?: string; type: ExploreType }
export interface Region { code: string; name: string }
export const defaultConditions: ExploreConditions = { keyword: '', type: 'all' };
export const pageSize = 20;
export function normalizeConditions(value: ExploreConditions): ExploreConditions {
  const keyword = value.keyword.trim();
  if (value.districtCode && !value.regionCode || keyword && value.type !== 'all') throw new TourError('parameters');
  return { keyword, type: value.type, regionCode: value.regionCode, districtCode: value.districtCode };
}
export function changeRegion(value: ExploreConditions, regionCode?: string): ExploreConditions {
  return { ...value, regionCode, districtCode: undefined };
}
export function queryKey(language: ContentLanguage, value: ExploreConditions, page?: number): string {
  const conditions = normalizeConditions(value);
  return JSON.stringify([services[language], language, conditions.keyword ? 'searchKeyword2' : 'areaBasedList2', conditions.keyword,
    conditions.regionCode ?? '', conditions.districtCode ?? '', conditions.type, '', '', '', 'A', pageSize, page ?? null]);
}
