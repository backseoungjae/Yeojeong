import { SavePlaceButton } from '@/features/library/components/SavePlaceButton';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useI18n } from '@/shared/i18n/useI18n';
import { formatDate, formatTimestamp } from '@/shared/i18n/format';
import { useTheme } from '@/shared/theme/useTheme';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Loading } from '@/shared/ui/Loading';
import { usePlaceDetail } from '../hooks/usePlaceDetail';
import { usePlaceActions } from '../hooks/usePlaceActions';
import { DetailAreaError } from '../components/DetailAreaError';
import { PlacePhotoGallery } from '../components/PlacePhotoGallery';
import { PlaceInfoRow } from '../components/PlaceInfoRow';
export default function PlaceDetailScreen() {
  const params = useLocalSearchParams<{ placeId?: string | string[] }>();
  const identifier = typeof params.placeId === 'string' ? params.placeId : '';
  const { t, language } = useI18n();
  const { spacing } = useTheme();
  const { basic, info, photos, gallery, snapshot, historyError, retry } = usePlaceDetail(identifier);
  const actions = usePlaceActions(identifier);
  const offline = basic.status === 'error' && Boolean(snapshot);
  const detail = basic.data ?? (offline && snapshot ? { place: snapshot.place, address: snapshot.place.address } : undefined);
  return <Screen>
    <Section title={t('place.photos')}>
      {photos.status === 'idle' || photos.status === 'loading' ? <Skeleton /> : photos.status === 'error' ? <DetailAreaError error={photos.error} onRetry={() => retry('photos')} />
        : <PlacePhotoGallery key={identifier} photos={gallery} placeName={detail?.place.name} />}
    </Section>
    {basic.status === 'error' && <Section title={t('place.basic')}><DetailAreaError error={basic.error} onRetry={() => retry('basic')} /></Section>}
    {offline && snapshot && <Text>{t('local.snapshotNotice', { value: formatTimestamp(snapshot.capturedAt, language) })}</Text>}
    {historyError && <Text tone="danger" accessibilityRole="alert">{t('local.historyError')}</Text>}
    {basic.status === 'idle' || basic.status === 'loading' ? <Skeleton /> : detail && <>
      <View style={{ gap: spacing.sm }}>
        <Text variant="title" accessibilityRole="header">{detail.place.name}</Text>
        <Text tone="muted">{detail.address ?? t('explore.regionUnknown')}</Text>
        <Text variant="label">{t(`explore.type.${detail.place.type}`)}</Text>
        {detail.place.language !== language && <Text>{t('place.originalLanguage', { language: t(detail.place.language === 'ko' ? 'settings.korean' : 'settings.english') })}</Text>}
      </View>
      <SavePlaceButton place={detail.place} />
      <Button label={t('place.addToTrip')} disabled variant="secondary" />
      <Text variant="caption" tone="muted">{t('place.actionsPending')}</Text>
      <Section title={t('place.description')}><Text selectable>{detail.description ?? t(offline ? 'local.offlineDescription' : 'place.noDescription')}</Text></Section>
      <Section title={t('place.address')}>
        <Text selectable>{detail.address ?? t('place.noAddress')}</Text>
        {detail.address && <Button label={t('place.copyAddress')} variant="secondary" busy={actions.busy} onPress={() => void actions.copy(detail.address ?? '')} />}
      </Section>
      {(detail.telephone || detail.websiteUrl) && <Section title={t('place.contact')}>
        {detail.telephone && <PlaceInfoRow label={t('place.phone')} value={detail.telephone} />}
        {detail.phoneUrl && <Button label={t('place.call')} variant="secondary" disabled={actions.busy} onPress={() => void actions.open(detail.phoneUrl ?? '', 'phone')} />}
        {detail.websiteUrl && <><Text selectable>{detail.websiteUrl}</Text><Button label={t('place.openWebsite')} variant="secondary" disabled={actions.busy} onPress={() => void actions.open(detail.websiteUrl ?? '', 'website')} /></>}
      </Section>}
    </>}
    {actions.message && <Text accessibilityRole="alert" accessibilityLiveRegion="polite">{actions.message}</Text>}
    <Section title={t('place.info')}>
      {info.status === 'idle' || info.status === 'loading' ? <Loading /> : info.status === 'blocked' ? <Text tone="muted">{t('place.infoBlocked')}</Text>
        : info.status === 'error' ? <DetailAreaError error={info.error} onRetry={() => retry('info')} /> : info.data?.length ? info.data.map(row => <View key={row.key} style={{ gap: spacing.sm }}>
          <PlaceInfoRow label={t(`place.info.${row.key}`)} value={row.value} />
          {row.phoneUrl && <Button label={t('place.callInfo')} variant="secondary" disabled={actions.busy} onPress={() => void actions.open(row.phoneUrl ?? '', 'phone')} />}
        </View>) : <Text tone="muted">{t(detail?.place.type === 'other' ? 'place.otherInfo' : 'place.noInfo')}</Text>}
    </Section>
    <Section title={t('place.attribution')}>
      <Text>{t('explore.source')}</Text>
      {detail?.modifiedDate && <Text>{t('place.modified', { value: formatDate(detail.modifiedDate, language) })}</Text>}
    </Section>
  </Screen>;
}
