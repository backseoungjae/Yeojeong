import { formatTimestamp } from '@/shared/i18n/format';
import { View } from 'react-native';
import { useRef, useState } from 'react';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Section } from '@/shared/ui/Section';
import { ConfirmationPanel } from '@/shared/ui/ConfirmationPanel';
import type { ItineraryItem } from '../models/trip';
export function ItineraryCard({ item, total, draft, busy, onMemo, onSaveMemo, onDiscardMemo, onMove, onRemove, onOpen }: {
  item: ItineraryItem; total: number; draft: string; busy: boolean;
  onMemo: (value: string) => void; onSaveMemo: () => void; onDiscardMemo: () => void;
  onMove: (direction: -1 | 1) => void; onRemove: () => void; onOpen: () => void;
}) {
  const { t, language } = useI18n();
  const { spacing } = useTheme();
  const [discarding, setDiscarding] = useState(false);
  const discardButton = useRef<View>(null);
  return <Section title={t('trip.visitOrder', { order: item.position + 1, name: item.place.name })}>
    <Text>{item.place.address ?? t('explore.regionUnknown')}</Text>
    <Text tone="muted">{t(`explore.type.${item.place.type}`)}</Text>
    <Text variant="caption" tone="muted">{t('place.savedInfoAt', { value: formatTimestamp(item.capturedAt, language) })}</Text>
    {item.place.language !== language && <Text>{t('place.originalLanguage', { language: t(item.place.language === 'ko' ? 'settings.korean' : 'settings.english') })}</Text>}
    <Button label={t('trip.openPlace', { name: item.place.name })} variant="secondary" disabled={busy} onPress={onOpen} />
    <View style={{ gap: spacing.sm }}>
      <Button label={t('trip.moveUp', { name: item.place.name })} variant="secondary" disabled={busy || item.position === 0} onPress={() => onMove(-1)} />
      <Button label={t('trip.moveDown', { name: item.place.name })} variant="secondary" disabled={busy || item.position === total - 1} onPress={() => onMove(1)} />
    </View>
    <TextField label={t('trip.memoName', { name: item.place.name })} hint={t('trip.memoHint')} multiline value={draft} editable={!busy} onChangeText={value => { setDiscarding(false); onMemo(value); }} />
    <Button label={t('trip.saveMemoName', { name: item.place.name })} disabled={busy || draft === item.memo} onPress={() => { setDiscarding(false); onSaveMemo(); }} />
    {draft !== item.memo && <Button ref={discardButton} label={t('trip.discardMemoName', { name: item.place.name })} variant="secondary" disabled={busy} onPress={() => setDiscarding(true)} />}
    {discarding && draft !== item.memo && <ConfirmationPanel returnTarget={discardButton} title={t('trip.unsavedTitle')} description={t('trip.discardMemoHint', { name: item.place.name })}>
      <Button label={t('trip.confirmDiscardMemo', { name: item.place.name })} variant="secondary" disabled={busy} onPress={() => { setDiscarding(false); onDiscardMemo(); }} />
      <Button label={t('trip.keepEditing')} disabled={busy} onPress={() => setDiscarding(false)} />
    </ConfirmationPanel>}
    <Button label={t('trip.removeItem', { name: item.place.name })} variant="secondary" disabled={busy} onPress={onRemove} />
  </Section>;
}
