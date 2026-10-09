import { useEffect, useRef, useState } from 'react';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
export function useUnsavedChanges(dirty: boolean, discard: () => void) {
  const navigation = useNavigation();
  const [proceed, setProceed] = useState<(() => void) | null>(null);
  const [confirmed, setConfirmed] = useState<{ perform: () => void } | null>(null);
  const performed = useRef<typeof confirmed>(null);
  usePreventRemove(dirty, ({ data }) => setProceed(() => () => navigation.dispatch(data.action)));
  useEffect(() => {
    // 변경을 버린 상태가 반영된 뒤 이동해야 같은 이동을 다시 차단하지 않는다.
    if (confirmed && performed.current !== confirmed && !dirty) {
      performed.current = confirmed;
      confirmed.perform();
    }
  }, [confirmed, dirty]);
  useEffect(() => {
    if (!dirty || typeof window === 'undefined' || !window.addEventListener) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  return {
    confirming: Boolean(proceed),
    request: (action: () => void) => { if (dirty) setProceed(() => action); else action(); },
    cancel: () => setProceed(null),
    confirm: () => { const action = proceed; setProceed(null); discard(); if (action) setConfirmed({ perform: action }); },
  };
}
