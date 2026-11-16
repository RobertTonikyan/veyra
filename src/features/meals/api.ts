import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { resolveCategory, useCategoryMemory, useShoppingItems } from '@/features/shopping/api';
import { normalizeName } from '@/features/shopping/categories';
import { useHousehold } from '@/household/HouseholdProvider';
import { useI18n } from '@/i18n';
import { qk } from '@/services/queryKeys';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

import { asIngredients, parseQty, type Ingredient } from './ingredients';

export type Recipe = Tables<'recipes'>;
export type Slot = 'breakfast' | 'lunch' | 'dinner';
export type Meal = Tables<'meal_plan'> & { recipes: Pick<Recipe, 'id' | 'title' | 'ingredients'> | null };

function useHouseholdId(): string {
  const { household } = useHousehold();
  if (!household) throw new Error('Meals hooks need a household');
  return household.id;
}

// ---------- read ----------------------------------------------------------

/** Our recipes + the built-in ideas in the current app language. */
export function useRecipes() {
  const hid = useHouseholdId();
  const { language } = useI18n();

  return useQuery({
    queryKey: qk.recipes(hid, language),
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .or(`household_id.eq.${hid},and(household_id.is.null,locale.eq.${language})`)
        .order('title', { ascending: true });
      if (error) throw error;
      // ours first
      return [...data].sort((a, b) => Number(!a.household_id) - Number(!b.household_id));
    },
  });
}

/** Planned meals from `from` for `days` days (YYYY-MM-DD). */
export function useMealPlan(from: string, to: string) {
  const hid = useHouseholdId();

  return useQuery({
    queryKey: qk.mealPlan(hid, from),
    queryFn: async (): Promise<Meal[]> => {
      const { data, error } = await supabase
        .from('meal_plan')
        .select('*, recipes ( id, title, ingredients )')
        .eq('household_id', hid)
        .gte('day', from)
        .lt('day', to);
      if (error) throw error;
      return data;
    },
  });
}

// ---------- write ---------------------------------------------------------

export type MealInput = {
  existingId?: string;
  day: string;
  slot: Slot;
  recipe_id: string | null;
  title: string | null;
  cook: string | null;
};

/** One meal per day+slot: updates the existing one or creates it. */
export function useSetMeal() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ existingId, ...m }: MealInput) => {
      if (existingId) {
        const { error } = await supabase
          .from('meal_plan')
          .update({ recipe_id: m.recipe_id, title: m.title, cook: m.cook })
          .eq('id', existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('meal_plan').insert({ household_id: hid, ...m });
        if (error) throw error;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.table(hid, 'meal_plan') }),
  });
}

export function useClearMeal() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meal_plan').delete().eq('id', id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.table(hid, 'meal_plan') }),
  });
}

export type RecipeInput = {
  id?: string;
  title: string;
  description: string | null;
  ingredients: Ingredient[];
  steps: string[];
  prep_minutes: number | null;
  servings: number | null;
};

export function useSaveRecipe() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...r }: RecipeInput) => {
      const row = { ...r, ingredients: r.ingredients as unknown as Recipe['ingredients'] };
      if (id) {
        const { error } = await supabase.from('recipes').update(row).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('recipes').insert({ household_id: hid, ...row });
        if (error) throw error;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.table(hid, 'recipes') }),
  });
}

export function useDeleteRecipe() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.table(hid, 'recipes') }),
  });
}

/**
 * Puts ingredients on the shopping list: sorted into categories, amounts
 * turned into units where possible, and skipping what's already there.
 * Returns how many were added.
 */
export function useAddIngredientsToList() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();
  const { data: memory } = useCategoryMemory();
  const { data: items = [] } = useShoppingItems();

  return useMutation({
    mutationFn: async (raw: unknown[]) => {
      const open = new Set(items.filter((i) => !i.checked_at).map((i) => normalizeName(i.name)));
      const seen = new Set<string>();
      const rows = raw
        .flatMap((r) => asIngredients(r))
        .filter((ing) => {
          const key = normalizeName(ing.name);
          if (open.has(key) || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((ing) => {
          const q = parseQty(ing.qty);
          return {
            household_id: hid,
            name: ing.name.slice(0, 80),
            amount: q?.amount ?? null,
            unit: q?.unit ?? null,
            quantity: q ? null : (ing.qty?.slice(0, 20) ?? null),
            category: resolveCategory(ing.name, memory),
          };
        });

      if (rows.length === 0) return 0;
      const { error } = await supabase.from('shopping_items').insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.shopping(hid) }),
  });
}
