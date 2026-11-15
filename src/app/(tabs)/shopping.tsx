import { ChevronDown, ChevronUp, Plus, Scale, Search, ShoppingBasket, X } from 'lucide-react-native';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import {
  useAddShoppingItem,
  useClearCheckedItems,
  useDeleteShoppingItem,
  useShoppingItems,
  useShoppingSuggestions,
  useToggleShoppingItem,
  useUpdateShoppingItem,
  type ShoppingItem,
} from '@/features/shopping/api';
import { CATEGORY_ORDER, isCategory, normalizeName, type ShoppingCategory } from '@/features/shopping/categories';
import { CategoryIcon } from '@/features/shopping/CategoryIcon';
import { CategoryPicker } from '@/features/shopping/CategoryPicker';
import { EditItemSheet } from '@/features/shopping/EditItemSheet';
import { QuantityPicker, type Quantity } from '@/features/shopping/QuantityPicker';
import { ShoppingRow } from '@/features/shopping/ShoppingRow';
import { formatAmount } from '@/features/shopping/units';
import { useMemberMap } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { Button, Card, EmptyState, Screen, Sheet, Text, colors, fonts, radius, space, touch } from '@/ui';

type Group = { category: ShoppingCategory | null; items: ShoppingItem[] };

export default function ShoppingScreen() {
  const { t, isRTL } = useI18n();
  const members = useMemberMap();
  const inputRef = useRef<TextInput>(null);

  const { data: items = [], isPending, isError, refetch } = useShoppingItems();
  const addItem = useAddShoppingItem();
  const toggleItem = useToggleShoppingItem();
  const updateItem = useUpdateShoppingItem();
  const deleteItem = useDeleteShoppingItem();
  const clearChecked = useClearCheckedItems();

  const [draft, setDraft] = useState('');
  const [draftQty, setDraftQty] = useState<Quantity>(null);
  const [qtyOpen, setQtyOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [showChecked, setShowChecked] = useState(false);
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const textAlign = isRTL ? 'right' : 'left';
  const writingDirection = isRTL ? 'rtl' : 'ltr';

  // ---- derived lists ----
  const q = normalizeName(query);
  const matches = (i: ShoppingItem) => !q || normalizeName(i.name).includes(q);

  const allOpen = useMemo(() => items.filter((i) => !i.checked_at), [items]);
  const allChecked = useMemo(() => items.filter((i) => i.checked_at), [items]);
  const open = allOpen.filter(matches);
  const checked = allChecked.filter(matches);
  const suggestions = useShoppingSuggestions(allOpen.map((i) => i.name));

  const groups: Group[] = (() => {
    const map = new Map<ShoppingCategory | null, ShoppingItem[]>();
    for (const item of open) {
      const cat = isCategory(item.category) ? item.category : null;
      map.set(cat, [...(map.get(cat) ?? []), item]);
    }
    // Unsorted first so they get attention, then supermarket order.
    const order: (ShoppingCategory | null)[] = [null, ...CATEGORY_ORDER];
    return order.filter((c) => map.has(c)).map((c) => ({ category: c, items: map.get(c)! }));
  })();

  const firstUnsorted = allOpen.find((i) => !isCategory(i.category));

  // ---- actions ----
  const onMutationError = { onError: (e: unknown) => setError(t(dbErrorKey(e))) };

  function add(name: string, qty: Quantity = null) {
    const clean = name.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!clean) return;
    setError(null);
    addItem.mutate({ name: clean, amount: qty?.amount ?? null, unit: qty?.unit ?? null }, onMutationError);
  }

  function submitDraft() {
    add(draft, draftQty);
    setDraft('');
    setDraftQty(null);
    inputRef.current?.focus(); // keep the keyboard up for the next item
  }

  function setCategory(item: ShoppingItem, category: ShoppingCategory) {
    updateItem.mutate({ item, changes: { category } }, onMutationError);
  }

  const rowProps = (item: ShoppingItem, i: number) => ({
    item,
    first: i === 0,
    addedBy: item.added_by ? members.get(item.added_by) : undefined,
    onToggle: (it: ShoppingItem) => toggleItem.mutate(it, onMutationError),
    onEdit: setEditing,
    onDelete: (it: ShoppingItem) => deleteItem.mutate(it, onMutationError),
  });

  const draftQtyLabel = draftQty
    ? t(`shopping.unitsShort.${draftQty.unit}`, { amount: formatAmount(draftQty.amount) })
    : null;

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        {/* ---------- header ---------- */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="small" color="textMuted">
              {t('shopping.itemsCount', { count: allOpen.length })} ·{' '}
              {t('shopping.collectedCount', { count: allChecked.length })}
            </Text>
            <Text variant="display" accessibilityRole="header">
              {t('tabs.shopping')}
            </Text>
          </View>
          <IconButton
            label={searching ? t('shopping.closeSearch') : t('shopping.search')}
            onPress={() => {
              setSearching((s) => !s);
              setQuery('');
            }}
          >
            {searching ? <X size={20} color={colors.textSoft} /> : <Search size={20} color={colors.textSoft} />}
          </IconButton>
        </View>

        {/* ---------- search ---------- */}
        {searching ? (
          <Card padded={false} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md }}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              autoFocus
              placeholder={t('shopping.searchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={t('shopping.search')}
              returnKeyType="search"
              maxFontSizeMultiplier={2}
              selectionColor={colors.accent}
              style={{
                flex: 1,
                minHeight: touch.min + 4,
                color: colors.text,
                fontFamily: fonts.regular,
                fontSize: 16,
                textAlign,
                writingDirection,
              }}
            />
          </Card>
        ) : (
          /* ---------- add row ---------- */
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
                textAlign,
                writingDirection,
              }}
            />
            {/* amount / unit for the next item */}
            <Pressable
              onPress={() => setQtyOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={draftQtyLabel ? `${t('shopping.quantity')}: ${draftQtyLabel}` : t('shopping.quantity')}
              style={({ pressed }) => ({
                minWidth: touch.min,
                height: touch.min,
                paddingHorizontal: draftQtyLabel ? space.sm : 0,
                borderRadius: radius.sm,
                backgroundColor: draftQtyLabel ? 'rgba(240,138,108,0.14)' : pressed ? colors.sunken : colors.raised,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              {draftQtyLabel ? (
                <Text variant="small" weight="semibold" color="accent">
                  {draftQtyLabel}
                </Text>
              ) : (
                <Scale size={20} color={colors.textSoft} />
              )}
            </Pressable>
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
        )}

        {/* ---------- buy again ---------- */}
        {!searching && suggestions.length > 0 ? (
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

        {/* ---------- "what is this?" prompt for an unknown product ---------- */}
        {!searching && firstUnsorted ? (
          <Card style={{ gap: space.md, borderColor: 'rgba(235,182,86,0.35)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <CategoryIcon category={null} size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{t('shopping.whichCategory', { name: firstUnsorted.name })}</Text>
                <Text variant="small" color="textMuted">
                  {t('shopping.whichCategoryHint')}
                </Text>
              </View>
            </View>
            <CategoryPicker layout="compact" value={null} onChange={(c) => setCategory(firstUnsorted, c)} />
          </Card>
        ) : null}

        {error ? (
          <Text variant="small" color="roseText" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        {/* ---------- list ---------- */}
        {isPending ? (
          <ActivityIndicator color={colors.accent} accessibilityLabel={t('common.loading')} />
        ) : isError ? (
          <Card style={{ gap: space.md, alignItems: 'center' }}>
            <Text align="center">{t('errors.loadFailed')}</Text>
            <Button variant="secondary" label={t('common.retry')} onPress={() => refetch()} />
          </Card>
        ) : searching && q && open.length === 0 && checked.length === 0 ? (
          <Card style={{ gap: space.md, alignItems: 'center' }}>
            <Text color="textSoft" align="center">
              {t('shopping.noResults', { query: query.trim() })}
            </Text>
            <Button
              variant="secondary"
              label={t('shopping.addNamed', { name: query.trim() })}
              icon={<Plus size={18} color={colors.text} />}
              onPress={() => {
                add(query);
                setQuery('');
                setSearching(false);
              }}
            />
          </Card>
        ) : allOpen.length === 0 && allChecked.length === 0 ? (
          <EmptyState Icon={ShoppingBasket} title={t('shopping.emptyTitle')} body={t('shopping.emptyBody')} />
        ) : (
          <>
            {groups.map(({ category, items: groupItems }) => (
              <View key={category ?? 'unsorted'} style={{ gap: space.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <CategoryIcon category={category} size={28} />
                  <Text variant="label" color="textSoft" style={{ flex: 1 }} accessibilityRole="header">
                    {category ? t(`shopping.categories.${category}`) : t('shopping.unsorted')}
                  </Text>
                  <Text variant="label" color="textMuted">
                    {groupItems.length}
                  </Text>
                </View>
                <Card padded={false}>
                  {groupItems.map((item, i) => (
                    <ShoppingRow key={item.id} {...rowProps(item, i)} />
                  ))}
                </Card>
              </View>
            ))}

            {!searching && allOpen.length === 0 ? (
              <Text color="textSoft" align="center">
                {t('shopping.allDone')}
              </Text>
            ) : null}

            {/* ---------- collected ---------- */}
            {checked.length > 0 ? (
              <View style={{ gap: space.sm }}>
                <Pressable
                  onPress={() => setShowChecked((v) => !v)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showChecked || searching }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touch.min }}
                >
                  <Text variant="bodyStrong" color="textSoft" style={{ flex: 1 }}>
                    {t('shopping.collectedCount', { count: checked.length })}
                  </Text>
                  {showChecked || searching ? (
                    <ChevronUp size={20} color={colors.textMuted} />
                  ) : (
                    <ChevronDown size={20} color={colors.textMuted} />
                  )}
                </Pressable>

                {showChecked || searching ? (
                  <>
                    <Card padded={false}>
                      {checked.map((item, i) => (
                        <ShoppingRow key={item.id} {...rowProps(item, i)} />
                      ))}
                    </Card>
                    {!searching ? (
                      <Button
                        variant="ghost"
                        label={t('shopping.clearChecked')}
                        loading={clearChecked.isPending}
                        onPress={() => clearChecked.mutate(undefined, onMutationError)}
                      />
                    ) : null}
                  </>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </Screen>

      {/* amount for the item being typed */}
      <Sheet visible={qtyOpen} onClose={() => setQtyOpen(false)} title={t('shopping.quantity')}>
        <QuantityPicker value={draftQty} onChange={setDraftQty} />
        <Button label={t('common.save')} onPress={() => setQtyOpen(false)} fullWidth />
      </Sheet>

      <EditItemSheet
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(item, changes) => updateItem.mutate({ item, changes }, onMutationError)}
        onDelete={(item) => deleteItem.mutate(item, onMutationError)}
      />
    </View>
  );
}

function IconButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => ({
        width: touch.min,
        height: touch.min,
        borderRadius: touch.min / 2,
        backgroundColor: pressed ? colors.raised : colors.surface,
        borderWidth: 1,
        borderColor: colors.hairline,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      {children}
    </Pressable>
  );
}
