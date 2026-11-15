import { Check } from 'lucide-react-native';
import { Alert, Pressable, View } from 'react-native';

import type { Member } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { Avatar, Text, colors, radius, space } from '@/ui';

import type { ShoppingItem } from './api';

type Props = {
  item: ShoppingItem;
  addedBy?: Member;
  first: boolean;
  onToggle: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
};

export function ShoppingRow({ item, addedBy, first, onToggle, onDelete }: Props) {
  const { t } = useI18n();
  const checked = !!item.checked_at;

  function confirmDelete() {
    Alert.alert(t('shopping.deleteTitle', { name: item.name }), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => onDelete(item) },
    ]);
  }

  const meta = [item.quantity, addedBy ? t('shopping.addedBy', { name: addedBy.display_name }) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() => onToggle(item)}
      onLongPress={confirmDelete}
      delayLongPress={400}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={item.quantity ? `${item.name}, ${item.quantity}` : item.name}
      accessibilityHint={t('shopping.rowHint')}
      accessibilityActions={[{ name: 'delete', label: t('common.delete') }]}
      onAccessibilityAction={(e) => {
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
