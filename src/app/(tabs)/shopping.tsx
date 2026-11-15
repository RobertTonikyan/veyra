import { ChevronDown, ChevronUp, Plus, ShoppingBasket } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import {
  useAddShoppingItem,
  useClearCheckedItems,
  useDeleteShoppingItem,
  useShoppingItems,
  useShoppingSuggestions,
  useToggleShoppingItem,
  type ShoppingItem,
} from '@/features/shopping/api';
import { CATEGORY_ICON, CATEGORY_ORDER, isCategory, type ShoppingCategory } from '@/features/shopping/categories';
import { ShoppingRow } from '@/features/shopping/ShoppingRow';
import { useMemberMap } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { Button, Card, EmptyState, Screen, Text, colors, fonts, radius, space, touch } from '@/ui';

export default function ShoppingScreen() {
  const { t, isRTL } = useI18n();
  const members = useMemberMap();
  const inputRef = useRef<TextInput>(null);

  const { data: items = [], isPending, isError, refetch } = useShoppingItems();
  const addItem = useAddShoppingItem();
  const toggleItem = useToggleShoppingItem();
  const deleteItem = useDeleteShoppingItem();
  const clearChecked = useClearCheckedItems();

  const [draft, setDraft] = useState('');
  const [showChecked, setShowChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useMemo(() => items.filter((i) => !i.checked_at), [items]);
  const checked = useMemo(() => items.filter((i) => i.checked_at), [items]);
  const suggestions = useShoppingSuggestions(open.map((i) => i.name));

  // Group open items by category, in supermarket order.
  const groups = useMemo(() => {
    const map = new Map<ShoppingCategory, ShoppingItem[]>();
    for (const item of open) {
      const cat: ShoppingCategory = isCategory(item.category) ? item.category : 'other';
      map.set(cat, [...(map.get(cat) ?? []), item]);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({ category: c, items: map.get(c)! }));
  }, [open]);

  function add(name: string) {
    const clean = name.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!clean) return;
    setError(null);
    addItem.mutate(
      { name: clean },
      { onError: (e) => setError(t(dbErrorKey(e))) },
    );
  }

  function submitDraft() {
    add(draft);
    setDraft('');
    inputRef.current?.focus(); // keep the keyboard up for the next item
  }

  const onMutationError = { onError: (e: unknown) => setError(t(dbErrorKey(e))) };

  return (
    <Screen>
      {/* header */}
      <View style={{ gap: 2 }}>
        <Text variant="small" color="textMuted">
          {t('shopping.itemsCount', { count: open.length })} · {t('shopping.collectedCount', { count: checked.length })}
        </Text>
        <Text variant="display" accessibilityRole="header">
          {t('tabs.shopping')}
        </Text>
      </View>

      {/* add row */}
      <Card padded={false} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm }}>
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('shopping.addPlaceholder')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('shopping.addPlaceholder')}
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={submitDraft}
          maxLength={80}
          maxFontSizeMultiplier={2}
          selectionColor={colors.accent}
          style={{
            flex: 1,
            minHeight: touch.min,
            paddingHorizontal: space.sm,
            color: colors.text,
            fontFamily: fonts.regular,
            fontSize: 16,
            textAlign: isRTL ? 'right' : 'left',
            writingDirection: isRTL ? 'rtl' : 'ltr',
          }}
        />
        <Pressable
          onPress={submitDraft}
          disabled={!draft.trim()}
          accessibilityRole="button"
          accessibilityLabel={t('shopping.add')}
          accessibilityState={{ disabled: !draft.trim() }}
          style={({ pressed }) => ({
            width: touch.min,
            height: touch.min,
            borderRadius: radius.sm,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !draft.trim() ? 0.4 : pressed ? 0.8 : 1,
          })}
        >
          <Plus size={22} strokeWidth={2.5} color={colors.onAccent} />
        </Pressable>
      </Card>

      {/* buy-again chips */}
      {suggestions.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Text variant="label" color="textMuted">
            {t('shopping.buyAgain')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {suggestions.map((name) => (
              <Pressable
                key={name}
                onPress={() => add(name)}
                accessibilityRole="button"
                accessibilityLabel={t('shopping.addNamed', { name })}
                style={({ pressed }) => ({
                  minHeight: 36,
                  paddingHorizontal: space.md,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.raised : colors.surface,
                  justifyContent: 'center',
                })}
              >
                <Text variant="small" color="textSoft">
                  + {name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {error ? (
        <Text variant="small" color="roseText" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {/* list */}
      {isPending ? (
        <ActivityIndicator color={colors.accent} accessibilityLabel={t('common.loading')} />
      ) : isError ? (
        <Card style={{ gap: space.md, alignItems: 'center' }}>
          <Text align="center">{t('errors.loadFailed')}</Text>
          <Button variant="secondary" label={t('common.retry')} onPress={() => refetch()} />
        </Card>
      ) : open.length === 0 && checked.length === 0 ? (
        <EmptyState Icon={ShoppingBasket} title={t('shopping.emptyTitle')} body={t('shopping.emptyBody')} />
      ) : (
        <>
          {groups.map(({ category, items: groupItems }) => {
            const Icon = CATEGORY_ICON[category];
            return (
              <View key={category} style={{ gap: space.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Icon size={16} color={colors.textMuted} />
                  <Text variant="label" color="textMuted" style={{ flex: 1 }} accessibilityRole="header">
                    {t(`shopping.categories.${category}`)}
                  </Text>
                  <Text variant="label" color="textMuted">
                    {groupItems.length}
                  </Text>
                </View>
                <Card padded={false}>
                  {groupItems.map((item, i) => (
                    <ShoppingRow
                      key={item.id}
                      item={item}
                      first={i === 0}
                      addedBy={item.added_by ? members.get(item.added_by) : undefined}
                      onToggle={(it) => toggleItem.mutate(it, onMutationError)}
                      onDelete={(it) => deleteItem.mutate(it, onMutationError)}
                    />
                  ))}
                </Card>
              </View>
            );
          })}

          {open.length === 0 ? (
            <Text color="textSoft" align="center">
              {t('shopping.allDone')}
            </Text>
          ) : null}

          {/* collected */}
          {checked.length > 0 ? (
            <View style={{ gap: space.sm }}>
              <Pressable
                onPress={() => setShowChecked((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: showChecked }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touch.min }}
              >
                <Text variant="bodyStrong" color="textSoft" style={{ flex: 1 }}>
                  {t('shopping.collectedCount', { count: checked.length })}
                </Text>
                {showChecked ? (
                  <ChevronUp size={20} color={colors.textMuted} />
                ) : (
                  <ChevronDown size={20} color={colors.textMuted} />
                )}
              </Pressable>

              {showChecked ? (
                <>
                  <Card padded={false}>
                    {checked.map((item, i) => (
                      <ShoppingRow
                        key={item.id}
                        item={item}
                        first={i === 0}
                        addedBy={item.added_by ? members.get(item.added_by) : undefined}
                        onToggle={(it) => toggleItem.mutate(it, onMutationError)}
                        onDelete={(it) => deleteItem.mutate(it, onMutationError)}
                      />
                    ))}
                  </Card>
                  <Button
                    variant="ghost"
                    label={t('shopping.clearChecked')}
                    loading={clearChecked.isPending}
                    onPress={() => clearChecked.mutate(undefined, onMutationError)}
                  />
                </>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
