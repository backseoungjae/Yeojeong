import { useRef, useState, type RefObject } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusRegion } from '../accessibility/useFocusRegion';
import { formatDate, formatNumber } from '../i18n/format';
import { useI18n } from '../i18n/useI18n';
import { calendarWeeks, isSelectableDate, monthStart, shiftMonth } from '../lib/datePicker';
import { useTheme } from '../theme/useTheme';
import { Button } from './Button';
import { Text } from './Text';

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  required?: boolean;
}

function Calendar({ value, minDate, maxDate, onChange, onClose, returnTarget }: DateFieldProps & { onClose: () => void; returnTarget: RefObject<View | null> }) {
  const { t, language } = useI18n();
  const { colors, spacing, radius, layout } = useTheme();
  const focus = useFocusRegion(true, returnTarget);
  const initial = minDate && value < minDate ? minDate : maxDate && value > maxDate ? maxDate : value;
  const [month, setMonth] = useState(() => monthStart(initial));
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const weekdays = Array.from({ length: 7 }, (_, index) => formatDate(`2026-01-${String(4 + index).padStart(2, '0')}`, language, { weekday: 'short' }));
  return <View style={{ gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.surfaceMuted, borderRadius: radius.card }}>
    <View ref={focus} accessible accessibilityRole="header" accessibilityLabel={t('calendar.month', { month: formatDate(month, language, { year: 'numeric', month: 'long' }) })}>
      <Text variant="heading" accessibilityLiveRegion="polite">{formatDate(month, language, { year: 'numeric', month: 'long' })}</Text>
    </View>
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <Button label={t('calendar.previousMonth')} variant="secondary" style={{ flex: 1 }} disabled={previous === month || Boolean(minDate && previous < monthStart(minDate))} onPress={() => setMonth(previous)} />
      <Button label={t('calendar.nextMonth')} variant="secondary" style={{ flex: 1 }} disabled={next === month || Boolean(maxDate && next > monthStart(maxDate))} onPress={() => setMonth(next)} />
    </View>
    <ScrollView horizontal>
      <View style={{ flexGrow: 1, minWidth: layout.touchTarget * 7, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row' }}>{weekdays.map((day, index) => <Text key={index} variant="caption" style={{ flex: 1, textAlign: 'center' }}>{day}</Text>)}</View>
        {calendarWeeks(month).map((week, index) => <View key={index} style={{ flexDirection: 'row' }}>
          {week.map((day, weekday) => day ? <Button key={day} label={formatNumber(Number(day.slice(-2)), language)} accessibilityLabel={formatDate(day, language)}
            variant={day === value ? 'primary' : 'secondary'} selected={day === value} disabled={!isSelectableDate(day, minDate, maxDate)}
            style={{ flex: 1, minWidth: layout.touchTarget, paddingHorizontal: 0, borderRadius: radius.control }}
            onPress={() => { if (isSelectableDate(day, minDate, maxDate)) { onClose(); onChange(day); } }} /> : <View key={weekday} style={{ flex: 1, minWidth: layout.touchTarget }} />)}
        </View>)}
      </View>
    </ScrollView>
    <Button label={t('calendar.close')} variant="secondary" onPress={onClose} />
  </View>;
}

export function DateField(props: DateFieldProps) {
  const { t, language } = useI18n();
  const { spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const trigger = useRef<View>(null);
  const label = props.required ? t('common.required', { label: props.label }) : props.label;
  return <View style={{ gap: spacing.sm }}>
    <Text variant="label">{label}</Text>
    <Button ref={trigger} label={formatDate(props.value, language)} accessibilityLabel={t('calendar.choose', { label, date: formatDate(props.value, language) })}
      variant="secondary" selected={open} disabled={props.disabled} onPress={() => setOpen(previous => !previous)} />
    {open && !props.disabled && <Calendar {...props} returnTarget={trigger} onClose={() => setOpen(false)} />}
  </View>;
}
