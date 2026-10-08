import { calendarDate } from '../../i18n/format.ts';
import type { PlaceIdentifier, PlaceDetail, PlaceInfo, PlaceInfoKey, PlacePhoto } from '../../models/placeDetail.ts';
import { TourError } from './tourError.ts';
import { requiredText, textField, type TourRecord } from './tourDto.ts';
import { httpsImage, toPlace } from './placeAdapter.ts';
const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', bull: '•', middot: '·', copy: '©', reg: '®' };
function decodeEntities(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (!entity.startsWith('#')) return entities[entity.toLowerCase()] ?? match;
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
  });
}
// HTML을 렌더링하지 않고 일반 Text로만 전달한다. 링크 검증은 이 변환과 별도로 수행한다.
export function plainText(value?: string): string | undefined {
  if (!value) return undefined;
  const text = decodeEntities(value.replace(/<!--([\s\S]*?)(?:-->|$)/g, '')
    .replace(/<(script|style|iframe|object|template)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '')
    .replace(/<br\s*\/?\s*>|<\/(?:p|div|li|h[1-6]|tr)\s*>/gi, '\n')
    .replace(/<(?:[^"'<>]|"[^"]*"|'[^']*')*>/g, ''))
    .replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return text || undefined;
}
export function websiteUrl(value?: string): string | undefined {
  if (!value) return undefined;
  const hrefs = [...value.matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)].map(match => match[1] ?? match[2] ?? match[3]);
  if (hrefs.length > 1) return undefined;
  const candidate = decodeEntities(hrefs[0] ?? value).trim();
  if (/\s|[\u0000-\u001f\u007f\\<>]|%0[ad]/i.test(candidate)) return undefined;
  try {
    const url = new URL(candidate);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.') || /^(localhost|127\.|0\.|\[)/i.test(url.hostname)) return undefined;
    return url.href;
  } catch { return undefined; }
}
export function phoneUrl(value?: string): string | undefined {
  const text = plainText(value);
  if (!text || !/^\+?[\d ()\-.]+$/.test(text)) return undefined;
  const number = text.replace(/[ ()\-.]/g, '');
  return /^\+?\d{4,15}$/.test(number) ? `tel:${number}` : undefined;
}
function matches(item: TourRecord, identifier: PlaceIdentifier, typeCode?: string) {
  if (requiredText(item, 'contentid') !== identifier.contentId || typeCode && requiredText(item, 'contenttypeid') !== typeCode) throw new TourError('format');
}
export function toPlaceDetail(item: TourRecord, identifier: PlaceIdentifier): PlaceDetail {
  matches(item, identifier);
  const place = toPlace(item, identifier.language);
  // 상세 이름·주소·본문은 공급자가 반환한 언어를 유지하며 다른 서비스의 주소를 혼합하지 않는다.
  const name = plainText(place.name);
  if (!name) throw new TourError('format');
  place.name = name;
  const address = [plainText(textField(item, 'addr1')), plainText(textField(item, 'addr2'))].filter(Boolean).join(' ') || undefined;
  let modifiedDate: string | undefined;
  const modified = textField(item, 'modifiedtime');
  if (modified && /^\d{14}$/.test(modified)) {
    const date = `${modified.slice(0,4)}-${modified.slice(4,6)}-${modified.slice(6,8)}`;
    try { calendarDate(date); if (Number(modified.slice(8,10)) < 24 && Number(modified.slice(10,12)) < 60 && Number(modified.slice(12,14)) < 60) modifiedDate = date; } catch { /* 유효하지 않은 공급자 수정일은 표시하지 않는다. */ }
  }
  const telephone = plainText(textField(item, 'tel'));
  return { place, description: plainText(textField(item, 'overview')), address, telephone, phoneUrl: phoneUrl(telephone), websiteUrl: websiteUrl(textField(item, 'homepage')), modifiedDate };
}
const fields: Record<string, readonly (readonly [PlaceInfoKey, string])[]> = {
  attraction: [['hours','usetime'],['closed','restdate'],['contact','infocenter'],['parking','parking'],['season','useseason'],['experience','expguide'],['capacity','accomcount']],
  culture: [['hours','usetimeculture'],['closed','restdateculture'],['fees','usefee'],['discount','discountinfo'],['contact','infocenterculture'],['parking','parkingculture'],['parkingFees','parkingfee'],['duration','spendtime'],['capacity','accomcountculture'],['size','scale']],
  restaurant: [['hours','opentimefood'],['closed','restdatefood'],['contact','infocenterfood'],['menu','firstmenu'],['otherMenu','treatmenu'],['reservation','reservationfood'],['parking','parkingfood'],['capacity','seat']],
};
export function toPlaceInfo(item: TourRecord, identifier: PlaceIdentifier, detail: PlaceDetail): PlaceInfo[] {
  matches(item, identifier, detail.place.providerTypeCode);
  return (fields[detail.place.type] ?? []).flatMap(([key, field]) => {
    const value = plainText(textField(item, field));
    return value ? [{ key, value, phoneUrl: key === 'contact' ? phoneUrl(value) : undefined }] : [];
  });
}
export function toPlacePhoto(item: TourRecord, identifier: PlaceIdentifier, index: number): PlacePhoto {
  matches(item, identifier);
  const sourceUrl = textField(item, 'originimgurl');
  return { id: `${identifier.id}:photo:${textField(item, 'serialnum') ?? index}`, sourceUrl, url: httpsImage(sourceUrl), thumbnailUrl: httpsImage(textField(item, 'smallimageurl')), name: plainText(textField(item, 'imgname')), license: textField(item, 'cpyrhtDivCd') };
}
