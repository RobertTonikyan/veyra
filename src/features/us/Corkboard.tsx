import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Line, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { Text, fonts, radius, space } from '@/ui';

/** Paper colors for notes (index = notes.color_index). Dark ink on all of them → AA contrast. */
export const PAPER = ['#FFE9A8', '#FFD1DC', '#CDEFD6', '#CFE3FF', '#FFD8BE', '#E3D7FF', '#F1E4CF', '#C9F0EC'];
const INK = '#2E241D';
const PIN_COLORS = ['#E5484D', '#3E8EF7', '#2FB67C', '#F2A93B', '#A06CF0'];

/** Stable pseudo-random number from a string (same note → same tilt every time). */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ---------- the board ----------

export function Corkboard({ children }: { children: ReactNode }) {
  // fixed speckles so the cork texture doesn't jump between renders
  const specks = useMemo(
    () =>
      Array.from({ length: 140 }, (_, i) => ({
        x: (hash(`x${i}`) % 1000) / 10,
        y: (hash(`y${i}`) % 1000) / 10,
        r: 0.25 + (hash(`r${i}`) % 6) / 10,
        light: i % 3 === 0,
      })),
    [],
  );

  return (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 7,
        borderColor: '#4A3426', // wooden frame
        backgroundColor: '#A77B52', // cork
        overflow: 'hidden',
      }}
    >
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        {specks.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.light ? '#C49A6C' : '#7E5A3A'} opacity={0.55} />
        ))}
      </Svg>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          rowGap: space.xl,
          padding: space.lg,
          paddingTop: space.xl,
        }}
      >
        {children}
      </View>
    </View>
  );
}

// ---------- the pushpin ----------

function PushPin({ color }: { color: string }) {
  return (
    <Svg width={26} height={30} viewBox="0 0 26 30">
      <Defs>
        <RadialGradient id="head" cx="38%" cy="32%" r="70%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.85} />
          <Stop offset="0.35" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={1} />
        </RadialGradient>
      </Defs>
      {/* shadow on the paper */}
      <Ellipse cx={15.5} cy={24} rx={6} ry={2.2} fill="#000" opacity={0.22} />
      {/* needle */}
      <Line x1={13} y1={16} x2={14.5} y2={25} stroke="#8A8A8A" strokeWidth={1.6} strokeLinecap="round" />
      {/* head */}
      <Circle cx={13} cy={10} r={8.5} fill="url(#head)" />
      <Circle cx={13} cy={10} r={8.5} fill="none" stroke="#000" strokeOpacity={0.18} />
      <Rect x={9.5} y={5.5} width={3} height={2} rx={1} fill="#FFF" opacity={0.6} />
    </Svg>
  );
}

// ---------- a note pinned to the board ----------

type NoteProps = {
  id: string;
  body: string;
  author?: string;
  colorIndex: number;
  important: boolean;
  /** animate as "just pinned" */
  isNew: boolean;
  onPress: () => void;
  accessibilityLabel: string;
};

export function PaperNote({ id, body, author, colorIndex, important, isNew, onPress, accessibilityLabel }: NoteProps) {
  const reduceMotion = useReduceMotion();
  const h = hash(id);
  const tilt = ((h % 7) - 3) * 0.9; // −2.7° … +2.7°
  const pinColor = important ? PIN_COLORS[0] : PIN_COLORS[1 + (h % (PIN_COLORS.length - 1))];

  const drop = useRef(new Animated.Value(isNew && !reduceMotion ? 0 : 1)).current;
  const pinPop = useRef(new Animated.Value(isNew && !reduceMotion ? 0 : 1)).current;

  useEffect(() => {
    if (!isNew || reduceMotion) return;
    Animated.sequence([
      Animated.timing(drop, { toValue: 1, duration: 380, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.spring(pinPop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
    ]).start();
  }, [isNew, reduceMotion, drop, pinPop]);

  const translateY = drop.interpolate({ inputRange: [0, 1], outputRange: [-36, 0] });
  const scale = drop.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1] });
  const rotate = drop.interpolate({ inputRange: [0, 1], outputRange: [`${tilt * 3}deg`, `${tilt}deg`] });
  const pinScale = pinPop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });

  return (
    <Animated.View
      style={{
        width: '47%',
        opacity: drop,
        transform: [{ translateY }, { scale }, { rotate }],
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => ({
          minHeight: 128,
          paddingTop: space.xl,
          paddingHorizontal: space.md,
          paddingBottom: space.md,
          gap: space.sm,
          backgroundColor: PAPER[colorIndex % PAPER.length],
          borderRadius: 3,
          borderBottomRightRadius: 14, // a little curl
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 4 },
          elevation: 5,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Text
          numberOfLines={7}
          style={{ color: INK, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, flex: 1 }}
          maxFontSizeMultiplier={1.6}
        >
          {body}
        </Text>
        {author ? (
          <Text variant="small" style={{ color: INK, opacity: 0.6 }}>
            — {author}
          </Text>
        ) : null}
      </Pressable>

      {/* pin sits on top of the paper, over the top edge */}
      <Animated.View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{ position: 'absolute', top: -12, alignSelf: 'center', transform: [{ scale: pinScale }] }}
      >
        <PushPin color={pinColor} />
      </Animated.View>
    </Animated.View>
  );
}
