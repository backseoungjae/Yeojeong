import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useI18n } from '@/shared/i18n/useI18n';
import { copyPlaceAddress, openPlaceLink } from '../services/placeActions';
export function usePlaceActions(identifier: string) {
  const { t } = useI18n();
  const [state, setState] = useState<{ identifier: string; message?: 'copied' | 'copyFailed' | 'linkFailed'; busy: boolean }>({ identifier, busy: false });
  const active = useRef('');
  const pending = useRef(false);
  useEffect(() => { active.current = identifier; pending.current = false; return () => { active.current = ''; }; }, [identifier]);
  async function run(action: () => Promise<void>, success: 'copied' | undefined, failure: 'copyFailed' | 'linkFailed') {
    if (pending.current) return;
    pending.current = true; setState({ identifier, busy: true });
    let message: 'copied' | 'copyFailed' | 'linkFailed' | undefined = success;
    try { await action(); } catch { message = failure; }
    if (active.current === identifier) {
      pending.current = false; setState({ identifier, busy: false, message });
      if (message) AccessibilityInfo.announceForAccessibility(t(`place.${message}`));
    }
  }
  return { busy: state.identifier === identifier && state.busy, message: state.identifier === identifier && state.message ? t(`place.${state.message}`) : undefined,
    copy: (address: string) => run(() => copyPlaceAddress(address), 'copied', 'copyFailed'),
    open: (url: string, kind: 'phone' | 'website') => run(() => openPlaceLink(url, kind), undefined, 'linkFailed') };
}
