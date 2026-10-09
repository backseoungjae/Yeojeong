import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { colors, spacing, typography, type ResolvedTheme } from '@/shared/theme/tokens';
import { useAppDatabase } from '@/shared/database/DatabaseProvider';
import { createLocalDataRepository } from '../repositories/localDataRepository';
import { clearPhotoCache } from '../services/localDataService';
interface LocalDataControl { error: boolean; completed: boolean; reset: (loadingLabel: string, theme?: ResolvedTheme) => Promise<void> }
const LocalDataContext = createContext<LocalDataControl | null>(null);
export function LocalDataProvider({ children }: { children: ReactNode }) {
  const database = useAppDatabase();
  const [repository] = useState(() => createLocalDataRepository(database));
  const [session, setSession] = useState(0);
  const [loadingLabel, setLoadingLabel] = useState<string>();
  const [error, setError] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [theme, setTheme] = useState<ResolvedTheme>('light');
  // Promise 자체로 연속 확인을 막는다. 상태 갱신 전에 두 번 호출해도 하나만 실행한다.
  const operationRef = useRef<Promise<void> | undefined>(undefined);
  const reset = (label: string, resolvedTheme: ResolvedTheme = 'light'): Promise<void> => {
    if (operationRef.current) return operationRef.current;
    setError(false); setCompleted(false); setTheme(resolvedTheme); setLoadingLabel(label);
    operationRef.current = repository.clear(async () => {
      // 화면/이미지와 요청 구독의 해제를 기다린 후 앱 사진 캐시를 정리한다.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await clearPhotoCache();
    }).then(() => { setCompleted(true); }, () => { setError(true); }).finally(() => {
      setSession(value => value + 1); setLoadingLabel(undefined); operationRef.current = undefined;
    });
    return operationRef.current;
  };
  return <LocalDataContext.Provider value={{ reset, error, completed }}>
    {loadingLabel ? <View style={{ flex: 1, padding: spacing.lg, backgroundColor: colors[theme].background, justifyContent: 'center' }}><Text style={{ ...typography.body, color: colors[theme].text }} accessibilityRole="alert" accessibilityLiveRegion="polite">{loadingLabel}</Text></View>
      : <View key={session} style={{ flex: 1 }}>{children}</View>}
  </LocalDataContext.Provider>;
}
export function useLocalData() {
  const value = useContext(LocalDataContext);
  if (!value) throw new Error('LocalDataProvider is required');
  return value;
}
