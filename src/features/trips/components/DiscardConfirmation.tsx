import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { useI18n } from '@/shared/i18n/useI18n';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, View } from 'react-native';
export function DiscardConfirmation({ confirm, cancel }: { confirm: () => void; cancel: () => void }) {
  const { t } = useI18n();
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
  return <Section title={t('trip.unsavedTitle')}>
    <View ref={announcement} accessible accessibilityRole="alert" accessibilityLabel={t('trip.unsavedDescription')}>
      <Text>{t('trip.unsavedDescription')}</Text>
    </View>
    <Button label={t('trip.keepEditing')} onPress={cancel} />
    <Button label={t('trip.discard')} variant="secondary" onPress={confirm} />
  </Section>;
}
