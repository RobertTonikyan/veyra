import { Star } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useI18n } from '@/i18n';
import { colors, space } from '@/ui';

type Props = {
  value: number; // 0 = nothing chosen yet
  onChange: (value: number) => void;
  size?: number;
};

/**
 * Tap a star → every star up to it fills in, one after another, with a small pop.
 * Nothing is saved here; the screen shows a confirm button.
 */
export function StarRating({ value, onChange, size = 40 }: Props) {
  const { t } = useI18n();
  const reduceMotion = useReduceMotion();
  const scales = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

  useEffect(() => {
    if (reduceMotion || value === 0) return;
    Animated.stagger(
      70,
      scales.slice(0, value).map((s) =>
        Animated.sequence([
          Animated.timing(s, { toValue: 1.3, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.spring(s, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
        ]),
      ),
    ).start();
  }, [value, reduceMotion, scales]);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t('us.howWasIt')}
      accessibilityValue={{ min: 0, max: 5, now: value, text: value ? t('us.stars', { count: value }) : undefined }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onChange(Math.min(5, value + 1));
        if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(1, value - 1));
      }}
      style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={6} importantForAccessibility="no" accessibilityElementsHidden>
            <Animated.View style={{ transform: [{ scale: scales[n - 1] }] }}>
              <Star
                size={size}
                strokeWidth={1.6}
                color={filled ? colors.honey : colors.textMuted}
                fill={filled ? colors.honey : 'transparent'}
              />
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}
