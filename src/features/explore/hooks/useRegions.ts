import { useEffect, useState } from 'react';
import { TourError } from '@/shared/api/tour/tourError';
import { useI18n } from '@/shared/i18n/useI18n';
import type { Region } from '../models/exploreQuery';
import { useExploreContext } from './ExploreProvider';
interface RegionState { key: string; values: Region[]; loading: boolean; error?: TourError }
export function useRegions(regionCode?: string, enabled = true) {
  const { language } = useI18n();
  const { repository } = useExploreContext();
  const key = JSON.stringify([language, regionCode, enabled]);
  const [state, setState] = useState<RegionState>({ key: '', values: [], loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    // key가 다른 이전 결과는 렌더링 시 숨기므로 여기서 동기 상태 갱신이 필요하지 않다.
    repository.regions(language, regionCode, controller.signal).then(values => {
      if (!controller.signal.aborted) setState({ key, values, loading: false });
    }, error => {
      if (!controller.signal.aborted) setState({ key, values: [], loading: false, error: error instanceof TourError ? error : new TourError('network') });
    });
    return () => controller.abort();
  }, [repository, language, regionCode, enabled, key, attempt]);
  const visible: RegionState = enabled ? state.key === key ? state : { key, values: [], loading: true } : { key, values: [], loading: false };
  return { ...visible, retry: () => { setState({ key, values: [], loading: true }); setAttempt(value => value + 1); } };
}
