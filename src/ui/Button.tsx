import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { Text } from './Text';
import { colors, radius, space, touch } from './tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
};

const variantStyles: Record<Variant, { bg: string; border: string; text: string }> = {
  primary: { bg: colors.accent, border: colors.accent, text: colors.onAccent },
  secondary: { bg: colors.raised, border: colors.border, text: colors.text },
  ghost: { bg: 'transparent', border: 'transparent', text: colors.accent },
  danger: { bg: 'rgba(232,106,126,0.14)', border: 'rgba(232,106,126,0.4)', text: colors.roseText },
};

export function Button({
  label,
  variant = 'primary',
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const v = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={4}
      style={({ pressed }) => ({
        minHeight: touch.min + 4,
        paddingHorizontal: space.xl,
        borderRadius: radius.md,
        backgroundColor: v.bg,
        borderColor: v.border,
        borderWidth: 1,
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
      })}
      {...rest}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        {loading ? <ActivityIndicator color={v.text} /> : icon}
        <Text variant="bodyStrong" style={{ color: v.text }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}