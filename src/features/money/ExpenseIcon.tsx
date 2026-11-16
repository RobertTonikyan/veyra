import { View } from 'react-native';

import { radius } from '@/ui';

import { EXPENSE_COLOR, EXPENSE_ICON, type ExpenseCategory } from './categories';

/** Category glyph on a tinted tile — same visual language as the shopping categories. */
export function ExpenseIcon({ category, size = 40 }: { category: ExpenseCategory; size?: number }) {
  const Icon = EXPENSE_ICON[category];
  const color = EXPENSE_COLOR[category];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        width: size,
        height: size,
        borderRadius: Math.min(radius.sm, size / 3),
        backgroundColor: `${color}26`,
        borderWidth: 1,
        borderColor: `${color}40`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.9} color={color} />
    </View>
  );
}
