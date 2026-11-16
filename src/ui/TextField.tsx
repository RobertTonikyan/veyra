import { forwardRef, useState, type ComponentRef } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useIsRTL } from '@/i18n';

import { Text } from './Text';
import { colors, fonts, radius, space, touch } from './tokens';

/** What a ref to the input gives you (focus, blur, clear). RN 0.88+: TextInput is no longer a class type. */
export type TextInputHandle = ComponentRef<typeof TextInput>;

export type TextFieldProps = Omit<TextInputProps, 'ref'> & {
  label: string;
  hint?: string;
  error?: string | null;
  /** Emails, codes, URLs: always left-to-right, even in Hebrew. */
  forceLTR?: boolean;
};

export const TextField = forwardRef<TextInputHandle, TextFieldProps>(function TextField(
  { label, hint, error, forceLTR = false, style, onFocus, onBlur, ...rest },
  ref,
) {
  const isRTL = useIsRTL();
  const [focused, setFocused] = useState(false);
  const ltr = forceLTR || !isRTL;

  const borderColor = error ? colors.rose : focused ? colors.accent : colors.border;

  return (
    <View style={{ gap: space.xs }}>
      <Text variant="label" color="textSoft">
        {label}
      </Text>

      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        cursorColor={colors.accent}
        maxFontSizeMultiplier={2}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            minHeight: touch.min + 8,
            paddingHorizontal: space.lg,
            borderRadius: radius.md,
            borderWidth: 1.5,
            borderColor,
            backgroundColor: colors.sunken,
            color: colors.text,
            fontFamily: fonts.medium,
            fontSize: 17,
            textAlign: ltr ? 'left' : 'right',
            writingDirection: ltr ? 'ltr' : 'rtl',
          },
          style,
        ]}
        {...rest}
      />

      {error ? (
        <Text variant="small" color="roseText" accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" color="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
