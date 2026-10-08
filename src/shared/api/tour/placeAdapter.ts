import type { ContentLanguage, Place, PlaceType } from '../../models/place.ts';
import { services } from './tourConfig.ts';
import { requiredText, textField, type TourRecord } from './tourDto.ts';
export const typeCodes = { ko: { attraction: '12', culture: '14', restaurant: '39' }, en: { attraction: '76', culture: '78', restaurant: '82' } } as const;
export function placeType(language: ContentLanguage, code: string): PlaceType {
  for (const type of ['attraction', 'culture', 'restaurant'] as const) if (typeCodes[language][type] === code) return type;
  return 'other';
}
function coordinate(item: TourRecord, field: string, max: number) {
  const value = textField(item, field);
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= max ? n : undefined;
}
export function httpsImage(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.username || url.password) return undefined;
    // 국·영문 목록/사진 표본에서 TLS·200·JPEG를 확인한 관광공사 CDN 경로만 승격한다.
    if (url.protocol === 'http:' && url.hostname === 'tong.visitkorea.or.kr' && !url.port && !url.search && !url.hash
      && /^\/cms\/resource\/\d+\/[A-Za-z0-9_-]+\.(?:jpe?g|png|gif|webp)$/i.test(url.pathname)) url.protocol = 'https:';
    return url.protocol === 'https:' ? url.href : undefined;
  }
  catch { return undefined; }
}
export function toPlace(item: TourRecord, language: ContentLanguage): Place {
  const contentId = requiredText(item, 'contentid');
  return {
    id: `tourapi:${services[language]}:${contentId}`, contentId, service: services[language], language,
    name: requiredText(item, 'title'), providerTypeCode: requiredText(item, 'contenttypeid'), type: placeType(language, requiredText(item, 'contenttypeid')),
    address: textField(item, 'addr1'), regionCode: textField(item, 'lDongRegnCd'), districtCode: textField(item, 'lDongSignguCd'),
    classification: textField(item, 'lclsSystm1'), subClassification: textField(item, 'lclsSystm2'), detailClassification: textField(item, 'lclsSystm3'), longitude: coordinate(item, 'mapx', 180), latitude: coordinate(item, 'mapy', 90),
    imageSourceUrl: textField(item, 'firstimage'), imageUrl: httpsImage(textField(item, 'firstimage')), listImageUrl: httpsImage(textField(item, 'firstimage2')) ?? httpsImage(textField(item, 'firstimage')), imageLicense: textField(item, 'cpyrhtDivCd'), modifiedAt: textField(item, 'modifiedtime'), source: '한국관광공사 TourAPI',
  };
}
