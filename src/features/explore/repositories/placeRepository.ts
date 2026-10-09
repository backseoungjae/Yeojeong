import type { TourClient } from '../../../shared/api/tour/tourClient.ts';
import { toPlace, typeCodes } from '../../../shared/api/tour/placeAdapter.ts';
import { requiredText } from '../../../shared/api/tour/tourDto.ts';
import { TourError } from '../../../shared/api/tour/tourError.ts';
import { services } from '../../../shared/api/tour/tourConfig.ts';
import { RequestCache } from '../../../shared/cache/requestCache.ts';
import type { ContentLanguage, Place } from '../../../shared/models/place.ts';
import { normalizeConditions, pageSize, queryKey, type ExploreConditions, type Region } from '../models/exploreQuery.ts';
export interface PlacePage { places: Place[]; page: number; totalCount: number; hasNext: boolean }
export function createPlaceRepository(client: TourClient) {
  const pages = new RequestCache<PlacePage>();
  const regions = new RequestCache<Region[]>(24 * 60 * 60 * 1000, 50);
  return {
    dispose() { pages.clear(); regions.clear(); },
    cachedPage(language: ContentLanguage, conditions: ExploreConditions, page: number) { return pages.read(queryKey(language, conditions, page)); },
    page(language: ContentLanguage, value: ExploreConditions, page: number, signal?: AbortSignal): Promise<PlacePage> {
      const conditions = normalizeConditions(value);
      return pages.get(queryKey(language, conditions, page), async abort => {
        const parameters: Record<string, string> = { pageNo: String(page), numOfRows: String(pageSize), arrange: 'A' };
        if (conditions.regionCode) parameters.lDongRegnCd = conditions.regionCode;
        if (conditions.districtCode) parameters.lDongSignguCd = conditions.districtCode;
        if (conditions.keyword) parameters.keyword = conditions.keyword;
        else if (conditions.type !== 'all') parameters.contentTypeId = typeCodes[language][conditions.type];
        // 코드 조회 등은 요청 행 수 대신 실제 반환 수를 numOfRows로 돌려주므로 페이지 진행은 요청 행 수를 기준으로 한다.
        const result = await client.request(language, conditions.keyword ? 'searchKeyword2' : 'areaBasedList2', parameters, abort);
        if (result.page !== page || result.items.length > pageSize) throw new TourError('format');
        return { places: result.items.map(item => toPlace(item, language)), page, totalCount: result.totalCount, hasNext: result.items.length > 0 && page * pageSize < result.totalCount };
      }, signal);
    },
    regions(language: ContentLanguage, regionCode?: string, signal?: AbortSignal): Promise<Region[]> {
      const key = JSON.stringify([services[language], language, 'ldongCode2', regionCode ?? '', 'N']);
      return regions.get(key, async abort => {
        const values: Region[] = [];
        for (let page = 1; ; page++) {
          const parameters: Record<string, string> = { lDongListYn: 'N', numOfRows: '100', pageNo: String(page) };
          if (regionCode) parameters.lDongRegnCd = regionCode;
          const result = await client.request(language, 'ldongCode2', parameters, abort);
          if (result.page !== page || result.items.length > 100) throw new TourError('format');
          values.push(...result.items.map(item => ({ code: requiredText(item, 'code'), name: requiredText(item, 'name') })));
          if (page * 100 >= result.totalCount || !result.items.length) break;
          if (page >= 100) throw new TourError('format');
        }
        return [...new Map(values.map(value => [value.code, value])).values()];
      }, signal);
    },
  };
}
export type PlaceRepository = ReturnType<typeof createPlaceRepository>;
