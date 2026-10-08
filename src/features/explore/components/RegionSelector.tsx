import { View } from 'react-native';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import { Chip } from '@/shared/ui/Chip';
import { Section } from '@/shared/ui/Section';
import { Loading } from '@/shared/ui/Loading';
import { Text } from '@/shared/ui/Text';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useRegions } from '../hooks/useRegions';
import { useExploreError } from '../hooks/useExploreError';
import { changeRegion, type ExploreConditions } from '../models/exploreQuery';
export function RegionSelector({ value, onChange }: { value: ExploreConditions; onChange: (value: ExploreConditions) => void }) {
  const { t } = useI18n();
  const { spacing } = useTheme();
  const provinces = useRegions();
  const districts = useRegions(value.regionCode, Boolean(value.regionCode));
  const provinceError = useExploreError(provinces.error);
  const districtError = useExploreError(districts.error);
  const choices = { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } as const;
  return <>
    <Section title={t('explore.province')}>
      <View style={choices}>
        <Chip label={t('explore.nationwide')} selected={!value.regionCode} onPress={() => onChange(changeRegion(value))} />
        {provinces.values.map(region => <Chip key={region.code} label={region.name} selected={value.regionCode === region.code} onPress={() => onChange(changeRegion(value, region.code))} />)}
      </View>
      {provinces.loading && <Loading />}
      {provinceError && <ErrorState description={provinceError.description} onRetry={provinceError.retryable ? provinces.retry : undefined} />}
      {!provinces.loading && !provinceError && !provinces.values.length && <Text tone="muted">{t('explore.noRegions')}</Text>}
    </Section>
    {value.regionCode && <Section title={t('explore.district')}>
      <View style={choices}>
        <Chip label={t('explore.provinceAll')} selected={!value.districtCode} onPress={() => onChange({ ...value, districtCode: undefined })} />
        {districts.values.map(region => <Chip key={region.code} label={region.name} selected={value.districtCode === region.code} onPress={() => onChange({ ...value, districtCode: region.code })} />)}
      </View>
      {districts.loading && <Loading />}
      {districtError && <ErrorState description={districtError.description} onRetry={districtError.retryable ? districts.retry : undefined} />}
      {!districts.loading && !districtError && !districts.values.length && <Text tone="muted">{t('explore.noDistricts')}</Text>}
    </Section>}
  </>;
}
