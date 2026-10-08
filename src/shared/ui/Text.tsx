import { Text as NativeText, type TextProps } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useFontPreview } from './FontPreviewProvider';
export interface AppTextProps extends TextProps {
  variant?: 'title' | 'heading' | 'body' | 'label' | 'caption';
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  tone?: 'default' | 'muted' | 'danger' | 'accent';
}
export function Text({ variant = 'body', tone = 'default', headingLevel, style, ...props }: AppTextProps) {
  const { colors, typography } = useTheme();
  const scale = useFontPreview();
  const type = typography[variant];
  const color = tone === 'muted' ? colors.textMuted : tone === 'danger' ? colors.danger : tone === 'accent' ? colors.accent : colors.text;
  return <NativeText {...props} aria-level={headingLevel ?? (props.accessibilityRole === 'header' ? variant === 'title' ? 1 : 2 : undefined)} allowFontScaling style={[type, { color, fontSize: type.fontSize * scale, lineHeight: type.lineHeight * scale }, style]} />;
}
