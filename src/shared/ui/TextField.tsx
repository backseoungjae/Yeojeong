import { focusRing } from './focusRing';
import { useId, useState } from 'react';
import { TextInput, View, type TextInputProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useI18n } from '../i18n/useI18n';
import { useFontPreview } from './FontPreviewProvider';
import { Text } from './Text';
export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'accessibilityLabel'> {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  fieldId?: string;
}
export function TextField({ label, hint, error, fieldId, required = false, editable = true, ...props }: TextFieldProps) {
  const { colors, spacing, radius, typography, layout } = useTheme();
  const { t } = useI18n();
  const scale = useFontPreview();
  const generatedId = useId();
  const id = fieldId ?? generatedId;
  const [focused, setFocused] = useState(false);
  const accessibleLabel = required ? t('common.required', { label }) : label;
  const inputStyle: TextStyle = { ...focusRing(focused, colors.focus, layout.focusWidth), ...typography.body, fontSize: typography.body.fontSize * scale, lineHeight: typography.body.lineHeight * scale,
        color: editable ? colors.text : colors.disabledText, minHeight: layout.touchTarget, padding: spacing.md,
        borderRadius: radius.control, borderWidth: layout.focusWidth, borderColor: error ? colors.danger : focused ? colors.focus : colors.border,
        backgroundColor: editable ? colors.surface : colors.disabledBackground };
  return <View style={{ gap: spacing.sm }}>
    <Text nativeID={`${id}-label`} variant="label">{accessibleLabel}</Text>
    <TextInput {...props} editable={editable} accessibilityLabel={accessibleLabel} accessibilityLabelledBy={`${id}-label`}
      accessibilityHint={error ?? hint} accessibilityState={{ disabled: !editable }} aria-disabled={!editable} aria-invalid={Boolean(error)} aria-required={required}
      aria-describedby={error || hint ? `${id}-description` : undefined} allowFontScaling
      placeholderTextColor={colors.textMuted} selectionColor={colors.accent}
      onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }}
      style={inputStyle} />
    {(error || hint) && <Text nativeID={`${id}-description`} variant="caption" tone={error ? 'danger' : 'muted'} accessibilityLiveRegion={error ? 'polite' : undefined}>{error ?? hint}</Text>}
  </View>;
}
