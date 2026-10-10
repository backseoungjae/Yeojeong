import { formatTimestamp } from '@/shared/i18n/format';
import { Pressable, View } from 'react-native';
import { useRef, useState } from 'react';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { IconButton } from '@/shared/ui/IconButton';
import { focusRing } from '@/shared/ui/focusRing';
import { useFocusRegion } from '@/shared/accessibility/useFocusRegion';
import { ConfirmationPanel } from '@/shared/ui/ConfirmationPanel';
import type { ItineraryItem } from '../models/trip';
export function ItineraryCard({ item, total, editingOrder, draft, busy, onMemo, onSaveMemo, onDiscardMemo, onMove, onRemove, onOpen }: {
  item: ItineraryItem; total: number; editingOrder: boolean; draft: string; busy: boolean;
  onMemo: (value: string) => void; onSaveMemo: () => Promise<boolean>; onDiscardMemo: () => void;
  onMove: (direction: -1 | 1) => void; onRemove: () => void; onOpen: () => void;
}) {
  const { t, language } = useI18n();
  const { spacing, colors, radius, layout } = useTheme();
  const [discarding, setDiscarding] = useState(false);
  const [editingMemo, setEditingMemo] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const discardButton = useRef<View>(null);
  const memoButton = useRef<View>(null);
  const moreButton = useRef<View>(null);
  const dirty = draft !== item.memo;
  const memoOpen = editingMemo || dirty;
  const memoFocus = useFocusRegion(memoOpen, memoButton);
  const menuFocus = useFocusRegion(menuOpen, moreButton);
  return <View style={{ gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: layout.borderWidth, borderColor: colors.border }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('trip.openPlace', { name: item.place.name })} accessibilityState={{ disabled: busy }} aria-disabled={busy} disabled={busy} onPress={onOpen}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={({ pressed }) => ({ ...focusRing(focused, colors.focus, layout.focusWidth), flex: 1, minHeight: layout.touchTarget, gap: spacing.sm, padding: spacing.xs, borderRadius: radius.control, opacity: pressed ? 0.8 : 1 })}>
        <Text variant="heading">{t('trip.visitOrder', { order: item.position + 1, name: item.place.name })}</Text>
        <Text>{item.place.address ?? t('explore.regionUnknown')}</Text>
        <Text tone="muted">{t(`explore.type.${item.place.type}`)}</Text>
      </Pressable>
      <IconButton ref={moreButton} icon="more" label={t('trip.moreActions', { name: item.place.name })} selected={menuOpen} disabled={busy} onPress={() => setMenuOpen(previous => !previous)} />
    </View>
    <Text variant="caption" tone="muted">{t('place.savedInfoAt', { value: formatTimestamp(item.capturedAt, language) })}</Text>
    {item.place.language !== language && <Text>{t('place.originalLanguage', { language: t(item.place.language === 'ko' ? 'settings.korean' : 'settings.english') })}</Text>}
    {menuOpen && <View style={{ gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.surfaceMuted, borderRadius: radius.control }}>
      <Button ref={menuFocus} label={t('trip.removeItem', { name: item.place.name })} variant="secondary" disabled={busy} onPress={onRemove} />
      <Button label={t('trip.closeActions')} variant="secondary" disabled={busy} onPress={() => setMenuOpen(false)} />
    </View>}
    {editingOrder && <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }}>
      <IconButton icon="up" label={t('trip.moveUp', { name: item.place.name })} disabled={busy || item.position === 0} onPress={() => onMove(-1)} />
      <IconButton icon="down" label={t('trip.moveDown', { name: item.place.name })} disabled={busy || item.position === total - 1} onPress={() => onMove(1)} />
    </View>}
    {!memoOpen && <>
      {Boolean(item.memo) && <Text>{item.memo}</Text>}
      <Button ref={memoButton} label={t(item.memo ? 'trip.editMemo' : 'trip.addMemo')} accessibilityLabel={t(item.memo ? 'trip.editMemoName' : 'trip.addMemoName', { name: item.place.name })} variant="secondary" disabled={busy} onPress={() => setEditingMemo(true)} />
    </>}
    {memoOpen && <View style={{ gap: spacing.sm }}>
      <TextField labelRef={memoFocus} label={t('trip.memoName', { name: item.place.name })} hint={t('trip.memoHint')} multiline value={draft} editable={!busy} onChangeText={value => { setDiscarding(false); onMemo(value); }} />
      <Button label={t('trip.saveMemoName', { name: item.place.name })} disabled={busy || !dirty} onPress={() => { setDiscarding(false); void onSaveMemo().then(success => { if (success) setEditingMemo(false); }); }} />
      {!dirty && <Button label={t('trip.closeMemo')} variant="secondary" disabled={busy} onPress={() => setEditingMemo(false)} />}
      {dirty && <Button ref={discardButton} label={t('trip.discardMemoName', { name: item.place.name })} variant="secondary" disabled={busy} onPress={() => setDiscarding(true)} />}
    </View>}
    {discarding && draft !== item.memo && <ConfirmationPanel returnTarget={discardButton} title={t('trip.unsavedTitle')} description={t('trip.discardMemoHint', { name: item.place.name })}>
      <Button label={t('trip.confirmDiscardMemo', { name: item.place.name })} variant="secondary" disabled={busy} onPress={() => { setDiscarding(false); setEditingMemo(false); onDiscardMemo(); }} />
      <Button label={t('trip.keepEditing')} disabled={busy} onPress={() => setDiscarding(false)} />
    </ConfirmationPanel>}
  </View>;
}
