import type { ContentLanguage, TourService } from '../../models/place.ts';
import { TourError } from './tourError.ts';
export interface TourEnvironment { common?: string; ko?: string; en?: string }
export const services: Record<ContentLanguage, TourService> = { ko: 'KorService2', en: 'EngService2' };
export function resolveTourKey(env: TourEnvironment, language: ContentLanguage): string {
  const value = (env[language]?.trim() || env.common?.trim() || '');
  if (!value || /^(your[_ -]|replace|<)/i.test(value)) throw new TourError('configuration');
  try {
    // 포털의 인코딩 키와 디코딩 키를 모두 지원하되 쿼리는 한 번만 인코딩한다.
    const key = value.includes('%') ? decodeURIComponent(value) : value;
    if (/\s/.test(key)) throw new TourError('configuration');
    return key;
  } catch { throw new TourError('configuration'); }
}
export function getTourEnvironment(): TourEnvironment {
  return {
    common: process.env.EXPO_PUBLIC_TOUR_API_KEY,
    ko: process.env.EXPO_PUBLIC_TOUR_API_KO_KEY,
    en: process.env.EXPO_PUBLIC_TOUR_API_EN_KEY,
  };
}
export function configurationStatus(env: TourEnvironment) {
  return (['ko', 'en'] as const).map(language => {
    try { resolveTourKey(env, language); return { language, configured: true }; }
    catch { return { language, configured: false }; }
  });
}
