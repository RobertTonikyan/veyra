import type { LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from './Text';
import { colors, radius, space, touch } from './tokens';

type ChoiceCardProps = {
  title: string;
  description?: string;
  Icon: LucideIcon;
  selected: boolean;
  onPress: () => void;
};

/** A radio option shown as a card. Wrap a set of these in <View accessibilityRole="radiogroup">. */
export function ChoiceCard({ title, description, Icon, selected, onPress }: ChoiceCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: touch.min + 16,
        padding: space.lg,
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: selected ? colors.accent : colors.hairline,
        backgroundColor: selected ? 'rgba(240,138,108,0.10)' : colors.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? colors.accent : colors.raised,
        }}
      >
        <Icon size={20} strokeWidth={2} color={selected ? colors.onAccent : colors.textSoft} />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        {description ? (
          <Text variant="small" color="textMuted">
            {description}
          </Text>
        ) : null}
      </View>

      {/* radio dot */}
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.pill,
          borderWidth: 2,
          borderColor: selected ? colors.accent : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? (
          <View style={{ width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.accent }} />
        ) : null}
      </View>
    </Pressable>
  );
}
