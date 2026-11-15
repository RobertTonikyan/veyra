import { Pressable, View } from 'react-native';

import { useI18n } from '@/i18n';
import { Text, colors, radius, space } from '@/ui';

import { CATEGORY_COLOR, CATEGORY_ORDER, type ShoppingCategory } from './categories';
import { CategoryIcon } from './CategoryIcon';

type Props = {
  value: ShoppingCategory | null;
  onChange: (category: ShoppingCategory) => void;
  /** compact = horizontal chips (inline prompt); grid = tiles (edit sheet) */
  layout?: 'grid' | 'compact';
};

export function CategoryPicker({ value, onChange, layout = 'grid' }: Props) {
  const { t } = useI18n();
  const compact = layout === 'compact';

  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {CATEGORY_ORDER.map((category) => {
        const selected = value === category;
        const color = CATEGORY_COLOR[category];
        return (
          <Pressable
            key={category}
            onPress={() => onChange(category)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={t(`shopping.categories.${category}`)}
            style={({ pressed }) => ({
              flexDirection: compact ? 'row' : 'column',
              alignItems: 'center',
              gap: compact ? space.sm : space.xs,
              width: compact ? undefined : '31%',
              minHeight: compact ? 40 : 84,
              paddingHorizontal: compact ? space.sm : space.xs,
              paddingVertical: compact ? space.xs : space.sm,
              borderRadius: compact ? radius.pill : radius.md,
              borderWidth: 1.5,
              borderColor: selected ? color : colors.hairline,
              backgroundColor: selected ? `${color}1F` : pressed ? colors.raised : colors.sunken,
              justifyContent: 'center',
            })}
          >
            <CategoryIcon category={category} size={compact ? 26 : 36} />
            <Text
              variant="small"
              align="center"
              weight={selected ? 'semibold' : 'regular'}
              color={selected ? 'text' : 'textSoft'}
              numberOfLines={2}
            >
              {t(`shopping.categories.${category}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
