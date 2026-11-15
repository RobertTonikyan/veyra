import { Minus, Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useI18n } from '@/i18n';
import { Text, colors, radius, space, touch } from '@/ui';

import { UNITS, UNIT_DEFAULT, UNIT_STEP, formatAmount, type ShoppingUnit } from './units';

export type Quantity = { amount: number; unit: ShoppingUnit } | null;

type Props = {
  value: Quantity;
  onChange: (value: Quantity) => void;
};

/** Stepper + unit chips. "No amount" is a valid choice (just "milk"). */
export function QuantityPicker({ value, onChange }: Props) {
  const { t } = useI18n();

  function step(direction: 1 | -1) {
    if (!value) {
      if (direction === 1) onChange({ amount: 1, unit: 'unit' });
      return;
    }
    const next = Math.round((value.amount + direction * UNIT_STEP[value.unit]) * 100) / 100;
    onChange(next <= 0 ? null : { ...value, amount: Math.min(next, 99999) });
  }

  function pickUnit(unit: ShoppingUnit) {
    if (value?.unit === unit) return;
    onChange({ unit, amount: UNIT_DEFAULT[unit] });
  }

  const display = value ? t(`shopping.unitsShort.${value.unit}`, { amount: formatAmount(value.amount) }) : t('shopping.noAmount');

  return (
    <View style={{ gap: space.md }}>
      {/* stepper */}
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('shopping.quantity')}
        accessibilityValue={{ text: display }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      >
        <StepButton label={t('shopping.less')} onPress={() => step(-1)} disabled={!value}>
          <Minus size={20} color={colors.text} />
        </StepButton>
        <Text variant="title" align="center" style={{ flex: 1 }}>
          {display}
        </Text>
        <StepButton label={t('shopping.more')} onPress={() => step(1)}>
          <Plus size={20} color={colors.text} />
        </StepButton>
      </View>

      {/* units */}
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {UNITS.map((unit) => {
          const selected = value?.unit === unit;
          return (
            <Pressable
              key={unit}
              onPress={() => pickUnit(unit)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={t(`shopping.units.${unit}`)}
              style={({ pressed }) => ({
                minHeight: 40,
                paddingHorizontal: space.md,
                borderRadius: radius.pill,
                borderWidth: 1.5,
                borderColor: selected ? colors.accent : colors.border,
                backgroundColor: selected ? 'rgba(240,138,108,0.12)' : pressed ? colors.raised : 'transparent',
                justifyContent: 'center',
              })}
            >
              <Text variant="small" weight={selected ? 'semibold' : 'regular'} color={selected ? 'accent' : 'textSoft'}>
                {t(`shopping.units.${unit}`)}
              </Text>
            </Pressable>
          );
        })}
        {value ? (
          <Pressable
            onPress={() => onChange(null)}
            accessibilityRole="button"
            style={{ minHeight: 40, paddingHorizontal: space.md, justifyContent: 'center' }}
          >
            <Text variant="small" color="textMuted">
              {t('shopping.clearAmount')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function StepButton({
  label,
  onPress,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityElementsHidden
      importantForAccessibility="no"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: touch.min + 4,
        height: touch.min + 4,
        borderRadius: radius.md,
        backgroundColor: pressed ? colors.raised : colors.sunken,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}
