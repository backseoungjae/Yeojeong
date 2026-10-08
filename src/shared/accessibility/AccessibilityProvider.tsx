import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, useWindowDimensions } from 'react-native';
const AccessibilityContext = createContext<{ reduceMotion: boolean; screenReader: boolean | null; fontScale: number }>({ reduceMotion: true, screenReader: null, fontScale: 1 });
export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(true);
  const [screenReader, setScreenReader] = useState<boolean | null>(null);
  const { fontScale } = useWindowDimensions();
  useEffect(() => {
    let alive = true, motionChanged = false, readerChanged = false;
    const motionListener = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { motionChanged = true; setReduceMotion(value); });
    const readerListener = Platform.OS === 'web' ? undefined : AccessibilityInfo.addEventListener('screenReaderChanged', value => { readerChanged = true; setScreenReader(value); });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive && !motionChanged) setReduceMotion(value); }).catch(() => {});
    if (Platform.OS !== 'web') void AccessibilityInfo.isScreenReaderEnabled().then(value => { if (alive && !readerChanged) setScreenReader(value); }).catch(() => {});
    return () => { alive = false; motionListener?.remove(); readerListener?.remove(); };
  }, []);
  return <AccessibilityContext.Provider value={{ reduceMotion, screenReader, fontScale }}>{children}</AccessibilityContext.Provider>;
}
export function useAccessibility() { return useContext(AccessibilityContext); }
