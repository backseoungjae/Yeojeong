import { View } from 'react-native';
import { useTheme } from '@/shared/theme/useTheme';
import { Text } from '@/shared/ui/Text';
export function PlaceInfoRow({ label, value }: { label: string; value: string }) {
  const { spacing } = useTheme();
  return <View style={{ gap: spacing.xs }}><Text variant="label">{label}</Text><Text selectable>{value}</Text></View>;
}
