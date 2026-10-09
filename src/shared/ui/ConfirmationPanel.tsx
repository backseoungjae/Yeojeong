import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { Section } from './Section';
import { Text } from './Text';
export function ConfirmationPanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const announcement = useRef<View>(null);
  useEffect(() => {
    const previous = typeof document !== 'undefined' ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      const target = announcement.current;
      if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) { target.tabIndex = -1; target.focus(); }
      else if (target) AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
    });
    return () => {
      cancelAnimationFrame(frame);
      if (typeof HTMLElement !== 'undefined' && previous instanceof HTMLElement && document.contains(previous)) previous.focus();
    };
  }, []);
  return <Section title={title}>
    <View ref={announcement} accessible accessibilityRole="alert" accessibilityLabel={description}><Text>{description}</Text></View>
    {children}
  </Section>;
}
