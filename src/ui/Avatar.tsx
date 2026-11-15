import { View } from 'react-native';

import { Text } from './Text';
import { colors, memberColor } from './tokens';

type AvatarProps = {
  name: string;
  colorIndex: number;
  size?: number;
};

/** A member's initial on their color. Color is never the only signal: the initial is always there. */
export function Avatar({ name, colorIndex, size = 28 }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <View
      accessible
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: memberColor(colorIndex),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        weight="bold"
        align="center"
        style={{ color: colors.onAccent, fontSize: size * 0.45, lineHeight: size * 0.6 }}
        maxFontSizeMultiplier={1.2}
      >
        {initial}
      </Text>
    </View>
  );
}
