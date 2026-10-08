import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function useColorScheme() {
  // 정적 렌더링과 최초 hydration은 라이트 테마로 일치시킨다.
  const hasHydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const colorScheme = useRNColorScheme();
  return hasHydrated ? colorScheme : 'light';
}
