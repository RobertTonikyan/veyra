import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, Clock } from 'lucide-react-native';
import { createElement } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { useI18n } from '@/i18n';
import { Text, colors, radius, space, touch } from '@/ui';

type Props = {
  label: string;
  value: Date;
  mode: 'date' | 'time';
  onChange: (date: Date) => void;
};

/**
 * One field for date or time. iOS: the native compact picker inline.
 * Android: a button that opens the system dialog.
 * Web: the browser's own date / time input.
 */
export function DateTimeField({ label, value, mode, onChange }: Props) {
  const { language } = useI18n();
  const Icon = mode === 'date' ? Calendar : Clock;

  const text = (() => {
    try {
      return new Intl.DateTimeFormat(
        language,
        mode === 'date' ? { weekday: 'short', day: 'numeric', month: 'long' } : { hour: '2-digit', minute: '2-digit' },
      ).format(value);
    } catch {
      return value.toISOString();
    }
  })();

  const handle = (_e: DateTimePickerEvent, d?: Date) => {
    if (d) onChange(d);
  };

  if (Platform.OS === 'web') {
    const pad = (n: number) => String(n).padStart(2, '0');
    const inputValue =
      mode === 'date'
        ? `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
        : `${pad(value.getHours())}:${pad(value.getMinutes())}`;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: touch.min }}>
        <Icon size={18} color={colors.textMuted} />
        <Text style={{ flex: 1 }} color="textSoft">
          {label}
        </Text>
        {createElement('input', {
          type: mode,
          value: inputValue,
          step: mode === 'time' ? 300 : undefined,
          'aria-label': label,
          onChange: (e: { target: { value: string } }) => {
            const v = e.target.value;
            if (!v) return;
            const next = new Date(value);
            if (mode === 'date') {
              const [y, m, d] = v.split('-').map(Number);
              next.setFullYear(y, m - 1, d);
            } else {
              const [h, min] = v.split(':').map(Number);
              next.setHours(h, min, 0, 0);
            }
            onChange(next);
          },
          style: {
            colorScheme: 'dark',
            background: colors.sunken,
            color: colors.text,
            border: `1.5px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: '10px 12px',
            fontFamily: 'Rubik_500Medium, sans-serif',
            fontSize: 16,
          },
        })}
      </View>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: touch.min }}>
        <Icon size={18} color={colors.textMuted} />
        <Text style={{ flex: 1 }} color="textSoft">
          {label}
        </Text>
        <DateTimePicker
          value={value}
          mode={mode}
          display="compact"
          onChange={handle}
          locale={language}
          themeVariant="dark"
          accentColor={colors.accent}
          minuteInterval={5}
          accessibilityLabel={label}
        />
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => DateTimePickerAndroid.open({ value, mode, onChange: handle, is24Hour: true })}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${text}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: touch.min + 4,
        paddingHorizontal: space.md,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.raised : colors.sunken,
      })}
    >
      <Icon size={18} color={colors.textMuted} />
      <Text style={{ flex: 1 }} color="textSoft">
        {label}
      </Text>
      <Text weight="semibold">{text}</Text>
    </Pressable>
  );
}
