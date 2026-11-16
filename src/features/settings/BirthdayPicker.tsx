import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { daysInMonth, monthNames } from '@/features/birthdays';
import { useI18n } from '@/i18n';
import { Button, Sheet, Text, colors, radius, space } from '@/ui';

type Props = {
  visible: boolean;
  month: number | null;
  day: number | null;
  onClose: () => void;
  onSave: (month: number | null, day: number | null) => void;
};

/** Month grid + day grid. No year on purpose. */
export function BirthdayPicker({ visible, month, day, onClose, onSave }: Props) {
  const { t, language } = useI18n();
  const [m, setM] = useState<number | null>(month);
  const [d, setD] = useState<number | null>(day);

  useEffect(() => {
    if (!visible) return;
    setM(month);
    setD(day);
  }, [visible, month, day]);

  const months = monthNames(language);
  const maxDay = m ? daysInMonth(m) : 31;

  return (
    <Sheet visible={visible} onClose={onClose} title={t('settings.birthday')}>
      <Text variant="small" color="textSoft">
        {t('settings.birthdayHint')}
      </Text>

      <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.month')} style={grid}>
        {months.map((name, i) => (
          <Cell
            key={name}
            label={name}
            selected={m === i + 1}
            width="23%"
            onPress={() => {
              setM(i + 1);
              if (d && d > daysInMonth(i + 1)) setD(null);
            }}
          />
        ))}
      </View>

      {m ? (
        <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.day')} style={grid}>
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((n) => (
            <Cell key={n} label={String(n)} selected={d === n} width="12.4%" onPress={() => setD(n)} />
          ))}
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Button
          label={t('common.save')}
          disabled={!m || !d}
          onPress={() => {
            onSave(m, d);
            onClose();
          }}
          fullWidth
        />
        {month ? (
          <Button
            variant="ghost"
            label={t('settings.birthdayRemove')}
            onPress={() => {
              onSave(null, null);
              onClose();
            }}
            fullWidth
          />
        ) : null}
      </View>
    </Sheet>
  );
}

const grid = { flexDirection: 'row', flexWrap: 'wrap', gap: 6 } as const;

function Cell({
  label,
  selected,
  width,
  onPress,
}: {
  label: string;
  selected: boolean;
  width: `${number}%`;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width,
        minHeight: 40,
        borderRadius: radius.sm,
        borderWidth: 1.5,
        borderColor: selected ? colors.accent : colors.hairline,
        backgroundColor: selected ? 'rgba(240,138,108,0.14)' : pressed ? colors.raised : colors.sunken,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Text variant="small" weight={selected ? 'semibold' : 'regular'} color={selected ? 'accent' : 'textSoft'} align="center">
        {label}
      </Text>
    </Pressable>
  );
}
