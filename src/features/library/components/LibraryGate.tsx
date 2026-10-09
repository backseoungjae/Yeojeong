import type { ReactNode } from 'react';
import { useI18n } from '@/shared/i18n/useI18n';
import { Screen } from '@/shared/ui/Screen';
import { Loading } from '@/shared/ui/Loading';
import { Text } from '@/shared/ui/Text';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useLibrary } from '../hooks/LibraryProvider';
export function LibraryGate({ children }: { children: ReactNode }) {
  const { status, initializationError, store } = useLibrary();
  const { t } = useI18n();
  if (status === 'loading') return <Screen><Loading /><Text>{t('local.initializing')}</Text></Screen>;
  if (status === 'error') return <Screen><ErrorState title={t('local.initError')} description={t(initializationError === 'locked' ? 'local.dbLocked' : 'local.initErrorHint')} onRetry={() => void store.initialize()} /></Screen>;
  return children;
}
