import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { useIsRTL } from '@/i18n';

import { Text } from './Text';
import { colors, space, touch } from './tokens';

type BackButtonProps = {
  label: string;
  onPress: () => void;
};

export function BackButton({ label, onPress }: BackButtonProps) {
  const isRTL = useIsRTL();
  // "Back" points toward the start edge: right in Hebrew, left in English/Russian.
  const Chevron = isRTL ? ChevronRight : ChevronLeft;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        minHeight: touch.min,
        alignSelf: 'flex-start',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Chevron size={20} color={colors.textSoft} />
      <Text color="textSoft">{label}</Text>
    </Pressable>
  );
}
