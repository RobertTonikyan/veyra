import Plus from 'lucide-react-native/icons/plus';
import { Pressable } from 'react-native';
import { useInsets } from './insets';

import { TAB_BAR_HEIGHT, tabBarBottomOffset } from './TabBar';
import { colors, radius, space } from './tokens';

type FabProps = {
  onPress: () => void;
  accessibilityLabel: string;
};

export function Fab({ onPress, accessibilityLabel }: FabProps) {
  const insets = useInsets();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        end: space.xl, // logical: right in LTR, left in RTL
        bottom: tabBarBottomOffset(insets.bottom) + TAB_BAR_HEIGHT + space.lg,
        width: 58,
        height: 58,
        borderRadius: radius.pill,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
        shadowColor: colors.accent,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      })}
    >
      <Plus size={26} strokeWidth={2.4} color={colors.onAccent} />
    </Pressable>
  );
}