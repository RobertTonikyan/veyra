import Trash2 from 'lucide-react-native/icons/trash-2';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useI18n } from '@/i18n';
import { Button, Sheet, Text, TextField, colors, space } from '@/ui';

import type { ItemChanges, ShoppingItem } from './api';
import { CategoryPicker } from './CategoryPicker';
import { isCategory, type ShoppingCategory } from './categories';
import { QuantityPicker, type Quantity } from './QuantityPicker';
import { isUnit } from './units';

type Props = {
  item: ShoppingItem | null;
  onClose: () => void;
  onSave: (item: ShoppingItem, changes: ItemChanges) => void;
  onDelete: (item: ShoppingItem) => void;
};

export function EditItemSheet({ item, onClose, onSave, onDelete }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<Quantity>(null);
  const [category, setCategory] = useState<ShoppingCategory | null>(null);

  // Load the item's current values each time the sheet opens.
  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setQuantity(item.amount != null ? { amount: item.amount, unit: isUnit(item.unit) ? item.unit : 'unit' } : null);
    setCategory(isCategory(item.category) ? item.category : null);
  }, [item]);

  if (!item) return null;

  function save() {
    if (!item) return;
    const clean = name.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!clean) return;

    const changes: ItemChanges = {};
    if (clean !== item.name) changes.name = clean;
    const oldAmount = item.amount ?? null;
    if ((quantity?.amount ?? null) !== oldAmount || (quantity?.unit ?? null) !== (item.unit ?? null)) {
      changes.amount = quantity?.amount ?? null;
      changes.unit = quantity?.unit ?? null;
    }
    if (category && category !== item.category) changes.category = category;

    if (Object.keys(changes).length > 0) onSave(item, changes);
    onClose();
  }

  return (
    <Sheet visible={!!item} onClose={onClose} title={t('shopping.editTitle')}>
      <ScrollView
        style={{ maxHeight: 520 }}
        contentContainerStyle={{ gap: space.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <TextField label={t('shopping.itemName')} value={name} onChangeText={setName} maxLength={80} />

        <View style={{ gap: space.sm }}>
          <Text variant="label" color="textSoft">
            {t('shopping.quantity')}
          </Text>
          <QuantityPicker value={quantity} onChange={setQuantity} />
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="label" color="textSoft">
            {t('shopping.category')}
          </Text>
          <CategoryPicker value={category} onChange={setCategory} />
        </View>
      </ScrollView>

      <View style={{ gap: space.sm }}>
        <Button label={t('common.save')} onPress={save} disabled={!name.trim()} fullWidth />
        <Button
          variant="danger"
          label={t('common.delete')}
          icon={<Trash2 size={18} color={colors.roseText} />}
          onPress={() => {
            onDelete(item);
            onClose();
          }}
          fullWidth
        />
      </View>
    </Sheet>
  );
}
