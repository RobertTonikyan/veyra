import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import type { Member } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { Avatar, Text, colors, radius, space } from '@/ui';

import type { ShoppingItem } from './api';
import { formatQuantity } from './units';

type Props = {
  item: ShoppingItem;
  addedBy?: Member;
  first: boolean;
  onToggle: (item: ShoppingItem) => void;
  onEdit: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
};

export function ShoppingRow({ item, addedBy, first, onToggle, onEdit, onDelete }: Props) {
  const { t } = useI18n();
  const checked = !!item.checked_at;
  const quantity = formatQuantity(t, item);

  const meta = [quantity, addedBy ? t('shopping.addedBy', { name: addedBy.display_name }) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() => onToggle(item)}
      onLongPress={() => onEdit(item)}
      delayLongPress={350}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={quantity ? `${item.name}, ${quantity}` : item.name}
      accessibilityHint={t('shopping.rowHint')}
      accessibilityActions={[
        { name: 'edit', label: t('shopping.editTitle') },
        { name: 'delete', label: t('common.delete') },
      ]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'edit') onEdit(item);
        if (e.nativeEvent.actionName === 'delete') onDelete(item);
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: 56,
        paddingHorizontal: space.lg,
        paddingVertical: space.sm,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.hairline,
        backgroundColor: pressed ? colors.raised : 'transparent',
      })}
    >
      {/* checkbox */}
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: radius.pill,
          borderWidth: 2,
          borderColor: checked ? colors.sage : colors.border,
          backgroundColor: checked ? colors.sage : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Check size={14} strokeWidth={3} color={colors.onAccent} /> : null}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text
          color={checked ? 'textMuted' : 'text'}
          style={checked ? { textDecorationLine: 'line-through' } : undefined}
        >
          {item.name}
        </Text>
        {meta ? (
          <Text variant="small" color="textMuted">
            {meta}
          </Text>
        ) : null}
      </View>

      {addedBy ? (
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Avatar name={addedBy.display_name} colorIndex={addedBy.color_index} size={26} />
        </View>
      ) : null}
    </Pressable>
  );
}
