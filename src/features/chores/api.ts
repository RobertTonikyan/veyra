import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useHousehold } from '@/household/HouseholdProvider';
import { qk } from '@/services/queryKeys';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type Chore = Tables<'chores'>;
export type Effort = 5 | 10 | 20;
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';
export type ScorePeriod = 'week' | 'month' | 'all';

/** Weekly goal per member (spec: 100 points each). */
export const WEEKLY_GOAL_PER_MEMBER = 100;

function useHouseholdId(): string {
  const { household } = useHousehold();
  if (!household) throw new Error('Chores hooks need a household');
  return household.id;
}

// ---------- read ----------------------------------------------------------

/** Open chores (not archived), soonest first; chores with no date go last. */
export function useChores() {
  const hid = useHouseholdId();

  return useQuery({
    queryKey: qk.chores(hid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chores')
        .select('*')
        .eq('household_id', hid)
        .is('archived_at', null)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export type Score = { user_id: string; points: number; chores_done: number; rescues: number };

export function useScores(period: ScorePeriod) {
  const hid = useHouseholdId();

  return useQuery({
    queryKey: qk.scores(hid, period),
    queryFn: async (): Promise<Score[]> => {
      const { data, error } = await supabase.rpc('household_scores', { p_household: hid, p_period: period });
      if (error) throw error;
      return data;
    },
  });
}

// ---------- write ---------------------------------------------------------

export type NewChore = {
  title: string;
  effort: Effort;
  recurrence: Recurrence;
  due_date: string | null; // YYYY-MM-DD
  assignee: string | null; // null = anyone
  rotate: boolean;
  is_joint: boolean;
};

export function useAddChore() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chore: NewChore) => {
      const { error } = await supabase.from('chores').insert({ household_id: hid, ...chore });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.chores(hid) }),
  });
}

/** Marks a chore done on the server (points, rescue bonus, next date, next turn). Returns points earned. */
export function useCompleteChore() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();
  const key = qk.chores(hid);

  return useMutation({
    mutationFn: async ({ chore, withUsers = [] }: { chore: Chore; withUsers?: string[] }) => {
      const { data, error } = await supabase.rpc('complete_chore', { p_chore: chore.id, p_with: withUsers });
      if (error) throw error;
      return data;
    },
    // Hide it right away; the server decides where (and whether) it comes back.
    onMutate: async ({ chore }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Chore[]>(key);
      queryClient.setQueryData<Chore[]>(key, (old) => (old ?? []).filter((c) => c.id !== chore.id));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: qk.table(hid, 'chore_logs') });
    },
  });
}

export function useSnoozeChore() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chore: Chore) => {
      const { data, error } = await supabase.rpc('snooze_chore', { p_chore: chore.id });
      if (error) throw error;
      return data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.chores(hid) }),
  });
}

export function useDeleteChore() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();
  const key = qk.chores(hid);

  return useMutation({
    mutationFn: async (chore: Chore) => {
      const { error } = await supabase.from('chores').delete().eq('id', chore.id);
      if (error) throw error;
    },
    onMutate: async (chore) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Chore[]>(key);
      queryClient.setQueryData<Chore[]>(key, (old) => (old ?? []).filter((c) => c.id !== chore.id));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
