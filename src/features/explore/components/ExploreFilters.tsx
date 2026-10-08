import { View } from 'react-native';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import { Chip } from '@/shared/ui/Chip';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import { Section } from '@/shared/ui/Section';
import { RegionSelector } from './RegionSelector';
import { defaultConditions, type ExploreConditions } from '../models/exploreQuery';
export function ExploreFilters({ value, onChange, onApply, onCancel }: { value: ExploreConditions; onChange: (value: ExploreConditions) => void; onApply: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const { spacing, colors, radius } = useTheme();
  return <View style={{ gap: spacing.lg, padding: spacing.md, backgroundColor: colors.surfaceMuted, borderRadius: radius.card }}>
    <Text variant="heading" accessibilityRole="header">{t('explore.editFilters')}</Text>
    <RegionSelector value={value} onChange={onChange} />
    <Section title={t('explore.type')}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {(['all', 'attraction', 'culture', 'restaurant'] as const).map(type => <Chip key={type} label={t(`explore.type.${type}`)} selected={value.type === type} disabled={Boolean(value.keyword)} onPress={() => onChange({ ...value, type })} />)}
      </View>
      {Boolean(value.keyword) && <Text tone="muted">{t('explore.searchTypeNotice')}</Text>}
    </Section>
    <Button label={t('explore.resetDraft')} variant="secondary" onPress={() => onChange({ ...defaultConditions, keyword: value.keyword })} />
    <Button label={t('explore.apply')} onPress={onApply} />
    <Button label={t('explore.cancel')} variant="secondary" onPress={onCancel} />
  </View>;
}
