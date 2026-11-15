import { View, type ViewProps } from 'react-native';

import { colors, radius, space } from './tokens';

export type CardProps = ViewProps & {
  padded?: boolean;
  tone?: 'default' | 'accent';
};

export function Card({ padded = true, tone = 'default', style, ...rest }: CardProps) {
  const isAccent = tone === 'accent';

  return (
    <View
      style={[
        {
          backgroundColor: isAccent ? colors.accent : colors.surface,
          borderColor: isAccent ? colors.accent : colors.hairline,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: padded ? space.lg : 0,
          overflow: 'hidden',
        },
        style,
      ]}
      {...rest}
    />
  );
}