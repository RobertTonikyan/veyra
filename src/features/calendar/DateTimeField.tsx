import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, Clock } from 'lucide-react-native';
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
