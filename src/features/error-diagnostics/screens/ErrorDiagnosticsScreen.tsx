import { useState } from 'react';
import { useI18n } from '@/shared/i18n/useI18n';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
export default function ErrorDiagnosticsScreen() {
  const { t } = useI18n();
  const [fail, setFail] = useState(false);
  if (fail) throw new Error('Diagnostic render failure');
  return <Screen><Text>{t('dev.recoveryDescription')}</Text><Button label={t('dev.triggerError')} onPress={() => setFail(true)} /></Screen>;
}
