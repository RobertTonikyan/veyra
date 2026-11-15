import { Pressable, View } from 'react-native';

import { Text } from './Text';
import { colors, radius, space } from './tokens';

type Option<T extends string> = { value: T; label: string };

type SegmentedProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

/** Pill-shaped tab switch (e.g. week / month / all time). */
export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel }: SegmentedProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        padding: 4,
        gap: 4,
        borderRadius: radius.pill,
        backgroundColor: colors.sunken,
        borderWidth: 1,
        borderColor: colors.hairline,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              minHeight: 36,
              paddingHorizontal: space.sm,
              borderRadius: radius.pill,
              backgroundColor: selected ? colors.raised : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="small" weight={selected ? 'semibold' : 'regular'} color={selected ? 'text' : 'textMuted'} align="center">
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
