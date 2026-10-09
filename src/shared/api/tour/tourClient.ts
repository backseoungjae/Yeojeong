import { logEvent } from '../../observability/structuredLog.ts';
import type { ContentLanguage } from '../../models/place.ts';
import { resolveTourKey, services, type TourEnvironment } from './tourConfig.ts';
import { parseTourResponse } from './tourDto.ts';
import { TourError } from './tourError.ts';
export type TourEndpoint = 'areaBasedList2' | 'ldongCode2' | 'lclsSystmCode2' | 'searchKeyword2' | 'detailCommon2' | 'detailIntro2' | 'detailImage2';
export type TourParameters = Readonly<Record<string, string>>;
export type TourTransport = (url: string, signal: AbortSignal) => Promise<{ status: number; body: string }>;
const allowed: Record<TourEndpoint, readonly string[]> = {
  areaBasedList2: ['contentTypeId', 'lDongRegnCd', 'lDongSignguCd', 'lclsSystm1', 'lclsSystm2', 'lclsSystm3', 'arrange'],
  searchKeyword2: ['keyword', 'lDongRegnCd', 'lDongSignguCd', 'lclsSystm1', 'lclsSystm2', 'lclsSystm3', 'arrange'],
  ldongCode2: ['lDongRegnCd', 'lDongListYn'], lclsSystmCode2: ['lclsSystm1', 'lclsSystm2', 'lclsSystm3', 'lclsSystmListYn'],
  detailCommon2: ['contentId'], detailIntro2: ['contentId', 'contentTypeId'], detailImage2: ['contentId', 'imageYN'],
};
const transport: TourTransport = async (url, signal) => {
  const response = await fetch(url, { signal });
  return { status: response.status, body: await response.text() };
};
export function createTourClient(env: TourEnvironment, send: TourTransport = transport, mobileOS = 'ETC', timeoutMs = 15000) {
  return {
    async request(language: ContentLanguage, endpoint: TourEndpoint, parameters: TourParameters = {}, signal?: AbortSignal) {
      for (const [key, value] of Object.entries(parameters)) {
        if (![...allowed[endpoint], 'numOfRows', 'pageNo'].includes(key) || !value.trim()) throw new TourError('parameters');
      }
      for (const field of ['numOfRows', 'pageNo']) if (parameters[field] && (!/^\d+$/.test(parameters[field]) || Number(parameters[field]) < 1 || Number(parameters[field]) > (field === 'numOfRows' ? 100 : 100000))) throw new TourError('parameters');
      for (const [child, parent] of [['lDongSignguCd','lDongRegnCd'], ['lclsSystm2','lclsSystm1'], ['lclsSystm3','lclsSystm2']]) if (parameters[child] && !parameters[parent]) throw new TourError('parameters');
      if (endpoint === 'searchKeyword2' && !parameters.keyword?.trim()) throw new TourError('parameters');
      if (endpoint.startsWith('detail') && !parameters.contentId?.trim()) throw new TourError('parameters');
      if (endpoint === 'detailIntro2' && !parameters.contentTypeId?.trim()) throw new TourError('parameters');
      const query = new URLSearchParams({ MobileOS: mobileOS, MobileApp: 'Yeojeong', _type: 'json', numOfRows: '3', pageNo: '1', ...parameters, serviceKey: resolveTourKey(env, language) });
      const controller = new AbortController();
      const cancel = () => controller.abort();
      signal?.addEventListener('abort', cancel, { once: true });
      if (signal?.aborted) controller.abort();
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      try {
        if (controller.signal.aborted) throw new TourError('cancelled');
        const response = await send(`https://apis.data.go.kr/B551011/${services[language]}/${endpoint}?${query}`, controller.signal);
        if (controller.signal.aborted) throw new TourError(timedOut ? 'timeout' : 'cancelled');
        return parseTourResponse(response.body, response.status);
      } catch (error) {
        if (controller.signal.aborted) { if (timedOut) logEvent('api_failure','tour','timeout'); throw new TourError(timedOut ? 'timeout' : 'cancelled'); }
        if (error instanceof TourError) { if (error.kind !== 'cancelled') logEvent('api_failure','tour',error.kind); throw error; }
        logEvent('api_failure','tour','network');
        throw new TourError('network');
      } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
    },
  };
}
export type TourClient = ReturnType<typeof createTourClient>;
