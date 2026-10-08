import { useI18n } from '@/shared/i18n/useI18n';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
export default function TripCreateScreen() {
  const { t } = useI18n();
  return <Screen>
    <Text variant="title" accessibilityRole="header">{t('trip.createTitle')}</Text>
    <Text tone="muted">{t('trip.previewNotice')}</Text>
    <TextField label={t('trip.name')} placeholder={t('trip.namePlaceholder')} required editable={false} />
    <TextField label={t('trip.start')} hint={t('trip.dateHint')} editable={false} />
    <TextField label={t('trip.end')} editable={false} />
    <Button label={t('trip.save')} disabled />
  </Screen>;
}
