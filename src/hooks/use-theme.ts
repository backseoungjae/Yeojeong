import { useTheme as useAppTheme } from '@/shared/theme/useTheme';
// 기존 API 검증 화면의 공통 UI도 앱에서 선택한 테마를 사용한다.
export function useTheme() {
  const { colors } = useAppTheme();
  return { text: colors.text, background: colors.background, backgroundElement: colors.surface, backgroundSelected: colors.selected, textSecondary: colors.textMuted };
}
