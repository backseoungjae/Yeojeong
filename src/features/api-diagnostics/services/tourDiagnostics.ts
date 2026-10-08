import type { ContentLanguage, Place } from '../../../shared/models/place.ts';
import type { TourClient, TourEndpoint, TourParameters } from '../../../shared/api/tour/tourClient.ts';
import { type TourPage, textField, requiredText } from '../../../shared/api/tour/tourDto.ts';
import { toPlace, typeCodes, httpsImage } from '../../../shared/api/tour/placeAdapter.ts';
import { TourError, type TourErrorKind } from '../../../shared/api/tour/tourError.ts';
export interface DiagnosticResult {
  language: ContentLanguage;
  check: string;
  endpoint: TourEndpoint;
  state: 'ok' | 'empty' | 'error' | 'skipped';
  evidence?: { total: number; received: number; status: number; resultCode: string; fields: string[]; emptyFields?: string[]; codes?: { code: string; name: string }[]; ids?: string[]; types?: string[]; classifications?: string[]; imageSchemes?: string[]; matchesRequestedClassification?: boolean };
  error?: { kind: TourErrorKind; code?: string; status?: number };
  places?: Place[];
  images?: { url: string; license?: string }[];
}
export async function runTourDiagnostics(client: TourClient, signal?: AbortSignal, onResult?: (result: DiagnosticResult) => void) {
  const results: DiagnosticResult[] = [];
  for (const language of ['ko', 'en'] as const) {
    let blocked = false;
    const skip = (name: string, endpoint: TourEndpoint) => {
      const result: DiagnosticResult = { language, check: name, endpoint, state: 'skipped' };
      results.push(result); onResult?.(result);
    };
    const check = async (name: string, endpoint: TourEndpoint, params: TourParameters = {}, places = false): Promise<TourPage | undefined> => {
      if (signal?.aborted) throw new TourError('cancelled');
      let result: DiagnosticResult;
      let page: TourPage | undefined;
      if (blocked) result = { language, check: name, endpoint, state: 'skipped' };
      else {
        try {
          page = await client.request(language, endpoint, params, signal);
          const mapped = places ? page.items.map(item => toPlace(item, language)) : undefined;
          if (mapped && params.contentTypeId && mapped.some(place => place.providerTypeCode !== params.contentTypeId)) throw new TourError('format');
          if (mapped && params.contentId && mapped.some(place => place.contentId !== params.contentId)) throw new TourError('format');
          const fields = [...new Set(page.items.flatMap(item => Object.keys(item)))].filter(field => /^[a-zA-Z0-9_]{1,60}$/.test(field)).sort();
          result = { language, check: name, endpoint, state: page.items.length ? 'ok' : 'empty', places: mapped, evidence: {
            emptyFields: fields.filter(field => page?.items.some(item => item[field] === '' || item[field] === null)),
            codes: endpoint === 'ldongCode2' || endpoint === 'lclsSystmCode2' ? page.items.map(item => ({ code: requiredText(item, 'code'), name: requiredText(item, 'name') })) : undefined,
            total: page.totalCount, received: page.items.length, status: page.status, resultCode: page.resultCode, fields,
            ids: mapped?.map(place => place.id), types: mapped?.map(place => place.type),
            classifications: page.items.map(item => textField(item, 'lclsSystm1') ?? '').filter(Boolean),
            imageSchemes: page.items.map(item => textField(item, endpoint === 'detailImage2' ? 'originimgurl' : 'firstimage')).filter(Boolean).map(value => value?.startsWith('https://') ? 'https' : value?.startsWith('http://') ? 'http' : 'other'),
            matchesRequestedClassification: params.lclsSystm1 && page.items.length ? page.items.every(item => textField(item,'lclsSystm1') === params.lclsSystm1) : undefined,
          } };
          if (endpoint === 'detailImage2') result.images = page.items.flatMap(item => {
            const url = httpsImage(textField(item, 'originimgurl'));
            return url ? [{ url, license: textField(item, 'cpyrhtDivCd') }] : [];
          });
        } catch (error) {
          page = undefined;
          if (signal?.aborted) throw new TourError('cancelled');
          const safe = error instanceof TourError ? error : new TourError('format');
          result = { language, check: name, endpoint, state: 'error', error: { kind: safe.kind, code: safe.code, status: safe.status } };
          if (['authentication','quota','configuration','network','timeout'].includes(safe.kind)) blocked = true;
        }
      }
      results.push(result); onResult?.(result);
      return page;
    };
    const samples: { place: Place; code: string }[] = [];
    for (const type of ['attraction','culture','restaurant'] as const) {
      const page = await check(type, 'areaBasedList2', { contentTypeId: typeCodes[language][type], lDongRegnCd: '11', arrange: 'A' }, true);
      if (page?.items[0]) {
        try { samples.push({ place: toPlace(page.items[0], language), code: typeCodes[language][type] }); } catch { /* 해당 조회에 형식 오류가 이미 기록된다. */ }
      }
    }
    await check('regions', 'ldongCode2', { numOfRows: '100', lDongListYn: 'N' });
    await check('districts', 'ldongCode2', { numOfRows: '100', lDongRegnCd: '11', lDongListYn: 'N' });
    const classes = await check('classifications', 'lclsSystmCode2', { numOfRows: '100', lclsSystmListYn: 'N' });
    const keyword = language === 'ko' ? '경복궁' : 'Gyeongbokgung';
    const search = await check('search', 'searchKeyword2', { keyword, numOfRows: '10' }, true);
    const classification = search?.items.map(item => textField(item, 'lclsSystm1')).find(Boolean);
    if (classification) {
      await check('searchFiltered', 'searchKeyword2', { keyword, lclsSystm1: classification, numOfRows: '10' }, true);
      const other = classes?.items.map(item => textField(item, 'code') ?? textField(item, 'lclsSystm1')).find(code => code && code !== classification);
      if (other) await check('searchControl', 'searchKeyword2', { keyword, lclsSystm1: other, numOfRows: '10' }, true);
      else skip('searchControl', 'searchKeyword2');
    } else { skip('searchFiltered', 'searchKeyword2'); skip('searchControl', 'searchKeyword2'); }
    await check('noResults', 'searchKeyword2', { keyword: 'YeojeongNoSuchPlace9x7z20261008' }, true);
    for (const type of ['attraction','culture','restaurant'] as const) {
      const sample = samples.find(item => item.place.type === type);
      if (!sample) { skip(`${type}Common`, 'detailCommon2'); skip(`${type}Intro`, 'detailIntro2'); skip(`${type}Images`, 'detailImage2'); continue; }
      await check(`${sample.place.type}Common`, 'detailCommon2', { contentId: sample.place.contentId }, true);
      await check(`${sample.place.type}Intro`, 'detailIntro2', { contentId: sample.place.contentId, contentTypeId: sample.code });
      await check(`${sample.place.type}Images`, 'detailImage2', { contentId: sample.place.contentId, imageYN: 'Y' });
    }
  }
  return results;
}
