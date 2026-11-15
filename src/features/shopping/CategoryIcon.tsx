import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { View } from 'react-native';

import { radius } from '@/ui';

import { CATEGORY_COLOR, type ShoppingCategory } from './categories';

type Props = {
  category: ShoppingCategory | null;
  /** tile size; the glyph scales with it */
  size?: number;
};

const UNSORTED_COLOR = '#A89C91';

/**
 * Duotone glyphs drawn for Veyra (24×24 grid): a soft tinted body with a crisp
 * outline in the category color, on a tile of the same color at low opacity.
 */
export function CategoryIcon({ category, size = 36 }: Props) {
  const color = category ? CATEGORY_COLOR[category] : UNSORTED_COLOR;
  const glyph = Math.round(size * 0.62);

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        width: size,
        height: size,
        borderRadius: Math.min(radius.sm, size / 3),
        backgroundColor: `${color}26`, // ~15% tint
        borderWidth: 1,
        borderColor: `${color}40`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none">
        <Glyph category={category} color={color} />
      </Svg>
    </View>
  );
}

function Glyph({ category, color }: { category: ShoppingCategory | null; color: string }) {
  const line = { stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const soft = { fill: color, fillOpacity: 0.28 };
  const solid = { fill: color };

  switch (category) {
    case 'produce': // apple with leaf
      return (
        <>
          <Path
            d="M12 7.6c-1.7-1.3-4.7-1.3-6.1.9-1.7 2.7-.6 7.4 1.7 9.8 1.2 1.3 2.6 1.6 4.4.8 1.8.8 3.2.5 4.4-.8 2.3-2.4 3.4-7.1 1.7-9.8-1.4-2.2-4.4-2.2-6.1-.9Z"
            {...soft}
            {...line}
          />
          <Path d="M12 7.6c0-1.9.7-3.3 2.2-4.1" {...line} />
          <Path d="M13 5.3c1.4-.4 2.8 0 3.7 1.1-1.5.6-2.9.3-3.7-1.1Z" {...solid} />
        </>
      );
    case 'dairy': // milk carton with liquid level
      return (
        <>
          <Path d="M8 7.5h8v12a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 19.5v-12Z" {...soft} />
          <Path d="M8 14c1.3-.9 2.7-.9 4 0s2.7.9 4 0v5.5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 19.5V14Z" {...solid} fillOpacity={0.75} />
          <Path d="M8 7.5h8v12a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 19.5v-12ZM8 7.5 9.6 4h4.8L16 7.5M12 4v3.5" {...line} />
        </>
      );
    case 'bakery': // loaf with scoring
      return (
        <>
          <Path
            d="M4.8 11.4c0-3 3.2-5.2 7.2-5.2s7.2 2.2 7.2 5.2c0 1-.6 1.7-1.4 2V18a1.6 1.6 0 0 1-1.6 1.6H7.8A1.6 1.6 0 0 1 6.2 18v-4.6c-.8-.3-1.4-1-1.4-2Z"
            {...soft}
            {...line}
          />
          <Path d="M9.2 9.6 10.4 11.4M12.4 9 13.6 10.8M15.4 9.8l.9 1.4" {...line} />
        </>
      );
    case 'meat': // drumstick
      return (
        <>
          <Path
            d="M11.3 14.6c-2.6-2.2-2.7-6.8.6-9.1 3.3-2.3 7.8-.5 8.3 3.3.6 4.5-4.5 7.8-8.9 5.8Z"
            {...soft}
            {...line}
          />
          <Path d="m11.3 14.6-3.2 3.2" {...line} />
          <Circle cx={6.4} cy={17.6} r={1.6} {...solid} />
          <Circle cx={8.3} cy={19.5} r={1.6} {...solid} />
          <Path d="M14.2 8.2c1-.6 2.3-.5 3 .4" {...line} strokeOpacity={0.7} />
        </>
      );
    case 'pantry': // jar with lid and label
      return (
        <>
          <Path d="M7.6 7h8.8l.6 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l.6-2Z" {...soft} {...line} />
          <Rect x={6.8} y={3.4} width={10.4} height={3.4} rx={1.1} {...solid} />
          <Rect x={9.2} y={11.4} width={5.6} height={4.6} rx={1} {...line} />
        </>
      );
    case 'frozen': // snowflake on a soft disc
      return (
        <>
          <Circle cx={12} cy={12} r={5} {...soft} />
          <Path
            d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.6 4.6 12 7l2.4-2.4M9.6 19.4 12 17l2.4 2.4M4.6 10.4 7.9 9.5 7 6.2M19.4 13.6l-3.3.9.9 3.3"
            {...line}
          />
        </>
      );
    case 'drinks': // bottle with liquid
      return (
        <>
          <Path
            d="M10 3.5h4v3c0 .6.3 1.2.7 1.6 1 .9 1.6 2.2 1.6 3.6V19a2 2 0 0 1-2 2H9.7a2 2 0 0 1-2-2v-7.3c0-1.4.6-2.7 1.6-3.6.4-.4.7-1 .7-1.6v-3Z"
            {...soft}
          />
          <Path d="M7.7 13.6h8.6V19a2 2 0 0 1-2 2H9.7a2 2 0 0 1-2-2v-5.4Z" {...solid} fillOpacity={0.75} />
          <Path
            d="M10 3.5h4v3c0 .6.3 1.2.7 1.6 1 .9 1.6 2.2 1.6 3.6V19a2 2 0 0 1-2 2H9.7a2 2 0 0 1-2-2v-7.3c0-1.4.6-2.7 1.6-3.6.4-.4.7-1 .7-1.6v-3ZM9.4 3.5h5.2"
            {...line}
          />
        </>
      );
    case 'cleaning': // spray bottle with mist
      return (
        <>
          <Path d="M8 10.5h7v9a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 8 19.5v-9Z" {...soft} {...line} />
          <Path d="M9 10.5V7.4h4.6l2.6 1.3M10 7.4V5h4.2" {...line} />
          <Circle cx={19} cy={4.6} r={0.9} {...solid} />
          <Circle cx={20.2} cy={7.4} r={0.9} {...solid} />
          <Circle cx={18.6} cy={10} r={0.9} {...solid} />
        </>
      );
    case 'personal': // pump bottle with sparkle
      return (
        <>
          <Path d="M7.5 11h8v8.5a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V11Z" {...soft} {...line} />
          <Path d="M10 11V8.4h3V11M11.5 8.4V5.4h3.6" {...line} />
          <Path d="M18.6 12.2l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5.5-1.2Z" {...solid} />
        </>
      );
    case 'other': // shopping bag
      return (
        <>
          <Path d="M5.6 8.2h12.8l-1 11a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8l-1-11Z" {...soft} {...line} />
          <Path d="M9 10.4V7.2a3 3 0 0 1 6 0v3.2" {...line} />
        </>
      );
    default: // not sorted yet: a dashed box with a question mark
      return (
        <>
          <Rect x={4.5} y={4.5} width={15} height={15} rx={4} {...line} strokeDasharray="2.4 2.4" />
          <Path d="M10 9.8a2.1 2.1 0 1 1 3 1.9c-.6.3-1 .8-1 1.5v.4" {...line} />
          <Circle cx={12} cy={16.2} r={1} {...solid} />
        </>
      );
  }
}
