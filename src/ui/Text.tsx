import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useIsRTL } from '@/i18n';

import {
  colors,
  fonts,
  typography,
  type ColorName,
  type FontWeight,
  type TypographyVariant,
} from './tokens';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: ColorName | (string & {});
  weight?: FontWeight;
  align?: 'auto' | 'left' | 'right' | 'center';
};

function resolveColor(color: TextProps['color']): string {
  if (!color) return colors.text;
  return color in colors ? colors[color as ColorName] : color;
}

export function Text({
  variant = 'body',
  color = 'text',
  weight,
  align,
  style,
  maxFontSizeMultiplier = 2, // supports system text size up to 200%
  ...rest
}: TextProps) {
  const isRTL = useIsRTL();
  const t = typography[variant];

  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        {
          fontFamily: fonts[weight ?? t.weight],
          fontSize: t.size,
          lineHeight: t.line,
          letterSpacing: 'tracking' in t ? t.tracking : 0,
          color: resolveColor(color),
          // Explicit alignment: new-arch iOS and Android disagree when it's unset.
          textAlign: align ?? (isRTL ? 'right' : 'left'),
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]}
      {...rest}
    />
  );
}