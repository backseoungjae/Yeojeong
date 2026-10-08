import type { TourClient } from '../../../shared/api/tour/tourClient.ts';
import { toPlaceDetail, toPlaceInfo, toPlacePhoto } from '../../../shared/api/tour/detailAdapter.ts';
import { TourError } from '../../../shared/api/tour/tourError.ts';
import { RequestCache } from '../../../shared/cache/requestCache.ts';
import type { PlaceDetail, PlaceIdentifier, PlaceInfo, PlacePhoto } from '../../../shared/models/placeDetail.ts';
export function createPlaceDetailRepository(client: TourClient) {
  const basic = new RequestCache<PlaceDetail>(), info = new RequestCache<PlaceInfo[]>(), photos = new RequestCache<PlacePhoto[]>();
  const key = (id: PlaceIdentifier, endpoint: string) => JSON.stringify([id.service, id.language, id.contentId, endpoint]);
  return {
    basic(id: PlaceIdentifier, signal?: AbortSignal) {
      return basic.get(key(id, 'detailCommon2'), async abort => {
        const page = await client.request(id.language, 'detailCommon2', { contentId: id.contentId, numOfRows: '1' }, abort);
        if (page.items.length !== 1) throw new TourError('format');
        return toPlaceDetail(page.items[0], id);
      }, signal);
    },
    info(id: PlaceIdentifier, detail: PlaceDetail, signal?: AbortSignal) {
      if (detail.place.type === 'other') return Promise.resolve([]);
      return info.get(`${key(id, 'detailIntro2')}:${detail.place.providerTypeCode}`, async abort => {
        const page = await client.request(id.language, 'detailIntro2', { contentId: id.contentId, contentTypeId: detail.place.providerTypeCode, numOfRows: '1' }, abort);
        if (page.items.length > 1) throw new TourError('format');
        return page.items[0] ? toPlaceInfo(page.items[0], id, detail) : [];
      }, signal);
    },
    photos(id: PlaceIdentifier, signal?: AbortSignal) {
      return photos.get(key(id, 'detailImage2'), async abort => {
        const result: PlacePhoto[] = [];
        for (let number = 1; ; number++) {
          const page = await client.request(id.language, 'detailImage2', { contentId: id.contentId, imageYN: 'Y', numOfRows: '100', pageNo: String(number) }, abort);
          if (page.page !== number || page.items.length > 100) throw new TourError('format');
          result.push(...page.items.map((item, index) => toPlacePhoto(item, id, (number - 1) * 100 + index)));
          if (number * 100 >= page.totalCount || !page.items.length) break;
          if (number >= 10) throw new TourError('format');
        }
        return [...new Map(result.map(photo => [photo.sourceUrl ?? photo.id, photo])).values()];
      }, signal);
    },
  };
}
export type PlaceDetailRepository = ReturnType<typeof createPlaceDetailRepository>;
