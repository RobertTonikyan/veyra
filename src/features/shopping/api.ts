import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/AuthProvider';
import { useHousehold } from '@/household/HouseholdProvider';
import { qk } from '@/services/queryKeys';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

import { guessCategory, isCategory, normalizeName, type ShoppingCategory } from './categories';
import type { ShoppingUnit } from './units';

export type ShoppingItem = Tables<'shopping_items'>;

function useHouseholdId(): string {
  const { household } = useHousehold();
  if (!household) throw new Error('Shopping hooks need a household');
  return household.id;
}

const isTemp = (id: string) => id.startsWith('temp-');

// ---------- read ----------------------------------------------------------

export function useShoppingItems() {
  const hid = useHouseholdId();

  return useQuery({
    queryKey: qk.shopping(hid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('household_id', hid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * "Buy again" chips: the names this house adds most often (from the activity
 * feed, last 200 additions), minus what's already on the list.
 */
export function useShoppingSuggestions(openNames: string[], limit = 6) {
  const hid = useHouseholdId();

  const query = useQuery({
    queryKey: qk.shoppingSuggestions(hid),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity')
        .select('payload')
        .eq('household_id', hid)
        .eq('kind', 'shopping_added')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      const counts = new Map<string, { name: string; count: number }>();
      for (const row of data) {
        const name = (row.payload as { name?: unknown } | null)?.name;
        if (typeof name !== 'string' || !name.trim()) continue;
        const key = name.trim().toLowerCase();
        const entry = counts.get(key) ?? { name: name.trim(), count: 0 };
        entry.count += 1;
        counts.set(key, entry);
      }
      return [...counts.values()].sort((a, b) => b.count - a.count).map((e) => e.name);
    },
  });

  const open = new Set(openNames.map((n) => n.trim().toLowerCase()));
  return (query.data ?? []).filter((n) => !open.has(n.toLowerCase())).slice(0, limit);
}

/** What this house chose before for products the word list doesn't know. */
export function useCategoryMemory() {
  const hid = useHouseholdId();

  return useQuery({
    queryKey: qk.categoryMemory(hid),
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shopping_category_memory')
        .select('name_key, category')
        .eq('household_id', hid);
      if (error) throw error;
      const map = new Map<string, ShoppingCategory>();
      for (const row of data) if (isCategory(row.category)) map.set(row.name_key, row.category);
      return map;
    },
  });
}

/** House memory first, then the built-in word list, else null (= ask the user). */
export function resolveCategory(name: string, memory: Map<string, ShoppingCategory> | undefined) {
  return memory?.get(normalizeName(name)) ?? guessCategory(name);
}

// ---------- write (optimistic: the UI updates before the server answers) ---

export type NewItem = {
  name: string;
  amount?: number | null;
  unit?: ShoppingUnit | null;
};

export function useAddShoppingItem() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { data: memory } = useCategoryMemory();
  const key = qk.shopping(hid);

  return useMutation({
    mutationFn: async (input: NewItem) => {
      const { data, error } = await supabase
        .from('shopping_items')
        .insert({
          household_id: hid,
          name: input.name,
          amount: input.amount ?? null,
          unit: input.amount != null ? (input.unit ?? 'unit') : null,
          category: resolveCategory(input.name, memory),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingItem[]>(key);
      const optimistic: ShoppingItem = {
        id: `temp-${Date.now()}`,
        household_id: hid,
        name: input.name,
        quantity: null,
        amount: input.amount ?? null,
        unit: input.amount != null ? (input.unit ?? 'unit') : null,
        category: resolveCategory(input.name, memory),
        added_by: session?.user.id ?? null,
        checked_at: null,
        checked_by: null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<ShoppingItem[]>(key, (old) => [optimistic, ...(old ?? [])]);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useToggleShoppingItem() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const key = qk.shopping(hid);

  return useMutation({
    mutationFn: async (item: ShoppingItem) => {
      if (isTemp(item.id)) return;
      const checking = !item.checked_at;
      const { error } = await supabase
        .from('shopping_items')
        .update({
          checked_at: checking ? new Date().toISOString() : null,
          checked_by: checking ? (session?.user.id ?? null) : null,
        })
        .eq('id', item.id);
      if (error) throw error;
    },
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingItem[]>(key);
      const checking = !item.checked_at;
      queryClient.setQueryData<ShoppingItem[]>(key, (old) =>
        (old ?? []).map((i) =>
          i.id === item.id
            ? {
                ...i,
                checked_at: checking ? new Date().toISOString() : null,
                checked_by: checking ? (session?.user.id ?? null) : null,
              }
            : i,
        ),
      );
      return { previous };
    },
    onError: (_error, _item, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export type ItemChanges = {
  name?: string;
  amount?: number | null;
  unit?: ShoppingUnit | null;
  category?: ShoppingCategory;
};

/**
 * Edit an item. When the category changes it's also remembered for the house,
 * so the same product is sorted automatically next time.
 */
export function useUpdateShoppingItem() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();
  const key = qk.shopping(hid);

  return useMutation({
    mutationFn: async ({ item, changes }: { item: ShoppingItem; changes: ItemChanges }) => {
      if (isTemp(item.id)) return;
      const patch = {
        ...changes,
        ...('amount' in changes ? { unit: changes.amount != null ? (changes.unit ?? 'unit') : null } : {}),
      };
      const { error } = await supabase.from('shopping_items').update(patch).eq('id', item.id);
      if (error) throw error;

      if (changes.category) {
        const name = changes.name ?? item.name;
        const { error: memoryError } = await supabase
          .from('shopping_category_memory')
          .upsert(
            { household_id: hid, name_key: normalizeName(name).slice(0, 80), category: changes.category },
            { onConflict: 'household_id,name_key' },
          );
        if (memoryError && __DEV__) console.warn('[shopping] could not remember category', memoryError);
      }
    },
    onMutate: async ({ item, changes }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingItem[]>(key);
      queryClient.setQueryData<ShoppingItem[]>(key, (old) =>
        (old ?? []).map((i) =>
          i.id === item.id
            ? {
                ...i,
                ...changes,
                ...('amount' in changes
                  ? { amount: changes.amount ?? null, unit: changes.amount != null ? (changes.unit ?? 'unit') : null }
                  : {}),
              }
            : i,
        ),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: (_data, _error, { changes }) => {
      queryClient.invalidateQueries({ queryKey: key });
      if (changes.category) queryClient.invalidateQueries({ queryKey: qk.categoryMemory(hid) });
    },
  });
}

export function useDeleteShoppingItem() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();
  const key = qk.shopping(hid);

  return useMutation({
    mutationFn: async (item: ShoppingItem) => {
      if (isTemp(item.id)) return;
      const { error } = await supabase.from('shopping_items').delete().eq('id', item.id);
      if (error) throw error;
    },
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingItem[]>(key);
      queryClient.setQueryData<ShoppingItem[]>(key, (old) => (old ?? []).filter((i) => i.id !== item.id));
      return { previous };
    },
    onError: (_error, _item, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/** Removes everything already collected. */
export function useClearCheckedItems() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();
  const key = qk.shopping(hid);

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('shopping_items')
        .delete()
        .eq('household_id', hid)
        .not('checked_at', 'is', null);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingItem[]>(key);
      queryClient.setQueryData<ShoppingItem[]>(key, (old) => (old ?? []).filter((i) => !i.checked_at));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
