import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { IconButton } from '@/shared/ui/IconButton';
import { TextField } from '@/shared/ui/TextField';
import { Chip } from '@/shared/ui/Chip';
import { Loading } from '@/shared/ui/Loading';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Section } from '@/shared/ui/Section';
import { AppearanceControls } from '@/shared/ui/AppearanceControls';
import { FontPreviewProvider } from '@/shared/ui/FontPreviewProvider';
export default function ComponentGalleryScreen() {
  const { t, formatDate, formatNumber } = useI18n();
  const { spacing } = useTheme();
  const [scale, setScale] = useState(1);
  const [selected, setSelected] = useState(false);
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState<'gallery.action' | 'gallery.selected' | null>(null);
  return <Screen>
    <Text>{t('gallery.description')}</Text>
    <AppearanceControls />
    <Section title={t('gallery.font')}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Chip label={t('gallery.normalFont')} selected={scale === 1} onPress={() => setScale(1)} />
        <Chip label={t('gallery.largeFont')} selected={scale === 1.6} onPress={() => setScale(1.6)} />
      </View>
      <Text variant="caption" tone="muted">{t('gallery.fontNotice')}</Text>
    </Section>
    <FontPreviewProvider scale={scale}>
      <Section title={t('gallery.typography')}>
        <Text variant="title">{t('home.title')}</Text>
        <Text variant="heading">{t('app.tagline')}</Text>
        <Text>{t('gallery.long')}</Text>
        <Text variant="caption" tone="muted">{t('gallery.date', { value: formatDate('2026-10-08') })}</Text>
        <Text>{t('gallery.number', { value: formatNumber(1234567.89) })}</Text>
        <Text>{t('gallery.count', { count: 1 })}</Text><Text>{t('gallery.count', { count: 2 })}</Text>
      </Section>
      <Section title={t('gallery.controls')}>
        <Button label={t('gallery.primary')} onPress={() => setNotice('gallery.action')} />
        <Button label={t('gallery.secondary')} variant="secondary" onPress={() => setNotice('gallery.action')} />
        <Button label={t('gallery.long')} onPress={() => setNotice('gallery.action')} />
        <Button label={t('gallery.disabled')} disabled />
        <Button label={t('gallery.busy')} busy />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <IconButton icon="save" label={t('gallery.icon')} selected={selected} onPress={() => { setSelected(!selected); setNotice('gallery.selected'); }} />
          <Chip label={t('gallery.chip')} selected={selected} onPress={() => { setSelected(!selected); setNotice('gallery.selected'); }} />
          <Chip label={t('gallery.chipDisabled')} disabled />
        </View>
        {notice && <Text accessibilityLiveRegion="polite" accessibilityRole="alert">{t(notice)}</Text>}
        <TextField label={t('gallery.input')} placeholder={t('gallery.inputPlaceholder')} value={input} onChangeText={setInput} />
        <TextField label={t('gallery.errorInput')} error={t('gallery.inputError')} required />
        <TextField label={t('gallery.disabledInput')} editable={false} />
      </Section>
      <Section title={t('gallery.states')}>
        <Loading /><Skeleton />
        <EmptyState title={t('gallery.emptyTitle')} description={t('gallery.emptyDescription')} />
        <ErrorState onRetry={() => setNotice('gallery.action')} />
      </Section>
    </FontPreviewProvider>
    <Section title={t('dev.routes')}>
      <Button label={t('dev.placeRoute')} variant="secondary" onPress={() => router.push({ pathname: '/places/[placeId]', params: { placeId: 'preview' } })} />
      <Button label={t('trips.create')} variant="secondary" onPress={() => router.push('/trips/new')} />
      <Button label={t('dev.tripRoute')} variant="secondary" onPress={() => router.push({ pathname: '/trips/[tripId]', params: { tripId: 'preview' } })} />
    </Section>
  </Screen>;
}
