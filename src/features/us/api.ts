import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useHousehold } from '@/household/HouseholdProvider';
import { useI18n } from '@/i18n';
import { qk } from '@/services/queryKeys';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type DateIdea = Tables<'date_ideas'>;
export type IdeaMark = Tables<'date_idea_marks'>;
export type Note = Tables<'notes'>;
export type Goal = Tables<'goals'>;
export type IdeaCategory = 'home' | 'out' | 'active' | 'trip';

function useHouseholdId(): string {
  const { household } = useHousehold();
  if (!household) throw new Error('Us hooks need a household');
  return household.id;
}

// ---------- date ideas ----------------------------------------------------

export function useDateIdeas() {
  const hid = useHouseholdId();
  const { language } = useI18n();

  return useQuery({
    queryKey: qk.dateIdeas(hid, language),
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('date_ideas')
        .select('*')
        .or(`household_id.eq.${hid},and(household_id.is.null,locale.eq.${language})`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useIdeaMarks() {
  const hid = useHouseholdId();

  return useQuery({
    queryKey: qk.ideaMarks(hid),
    queryFn: async () => {
      const { data, error } = await supabase.from('date_idea_marks').select('*').eq('household_id', hid);
      if (error) throw error;
      return new Map(data.map((m) => [m.idea_id, m]));
    },
  });
}

/** Save for later / mark as done (with an optional 1–5 rating). */
export function useMarkIdea() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (m: { idea_id: string; saved: boolean; done_on: string | null; rating: number | null }) => {
      const { error } = await supabase
        .from('date_idea_marks')
        .upsert({ household_id: hid, ...m }, { onConflict: 'household_id,idea_id' });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.ideaMarks(hid) }),
  });
}

export function useAddIdea() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (idea: { title: string; description: string | null; category: IdeaCategory; cost_level: number }) => {
      const { error } = await supabase.from('date_ideas').insert({ household_id: hid, ...idea });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.table(hid, 'date_ideas') }),
  });
}

export function useDeleteIdea() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('date_ideas').delete().eq('id', id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.table(hid, 'date_ideas') }),
  });
}

// ---------- notes ---------------------------------------------------------

export function useNotes() {
  const hid = useHouseholdId();

  return useQuery({
    queryKey: qk.notes(hid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('household_id', hid)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveNote() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...n }: { id?: string; body: string; pinned: boolean; color_index: number }) => {
      if (id) {
        const { error } = await supabase.from('notes').update(n).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notes').insert({ household_id: hid, ...n });
        if (error) throw error;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.notes(hid) }),
  });
}

export function useDeleteNote() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.notes(hid) }),
  });
}

// ---------- goals ---------------------------------------------------------

export function useGoals() {
  const hid = useHouseholdId();

  return useQuery({
    queryKey: qk.goals(hid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('household_id', hid)
        .order('done_at', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddGoal() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (g: { title: string; emoji: string | null; target_agorot: number | null }) => {
      const { error } = await supabase.from('goals').insert({ household_id: hid, ...g });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.goals(hid) }),
  });
}

/** Put money in (positive) or take it out (negative). The total updates on the server. */
export function useContribute() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, amount }: { goalId: string; amount: number }) => {
      const { error } = await supabase
        .from('goal_contributions')
        .insert({ goal_id: goalId, household_id: hid, amount_agorot: amount });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.goals(hid) }),
  });
}

export function useUpdateGoal() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from('goals')
        .update({ done_at: done ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.goals(hid) }),
  });
}

export function useDeleteGoal() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.goals(hid) }),
  });
}
