import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/AuthProvider';
import { useHousehold } from '@/household/HouseholdProvider';
import { qk } from '@/services/queryKeys';
import { supabase } from '@/services/supabase';

/** Columns a member may change on their own profile (enforced by column grants). */
export type ProfilePatch = {
  display_name?: string;
  language?: 'he' | 'en' | 'ru';
  reminder_time?: string; // 'HH:MM'
  reminders_on?: boolean;
  birth_month?: number | null;
  birth_day?: number | null;
};

export function useUpdateProfile() {
  const { session } = useAuth();
  const { refresh, household } = useHousehold();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: ProfilePatch) => {
      if (!session) throw new Error('not_authenticated');
      const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refresh();
      // names and birthdays show up in everyone's member list
      if (household) queryClient.invalidateQueries({ queryKey: qk.members(household.id) });
    },
  });
}

/** Owner only (RLS). */
export type HouseholdPatch = {
  name?: string;
  weekly_reward?: string | null;
  monthly_budget_agorot?: number | null;
  birthday_heads_up?: boolean | null;
};

export function useUpdateHousehold() {
  const { household, refresh } = useHousehold();

  return useMutation({
    mutationFn: async (patch: HouseholdPatch) => {
      if (!household) throw new Error('no_household');
      const { error } = await supabase.from('households').update(patch).eq('id', household.id);
      if (error) throw error;
    },
    onSuccess: () => refresh(),
  });
}

export function useCreateInvite() {
  const { household } = useHousehold();

  return useMutation({
    mutationFn: async () => {
      if (!household) throw new Error('no_household');
      const { data, error } = await supabase.rpc('create_invite', {
        p_household: household.id,
        p_max_uses: household.type === 'couple' ? 1 : 19,
      });
      if (error) throw error;
      return String(data);
    },
  });
}

/** Leave the house (blocked while you still owe or are owed money there). */
export function useLeaveHousehold() {
  const { household, refresh } = useHousehold();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!household) throw new Error('no_household');
      const { error } = await supabase.rpc('leave_household', { p_household: household.id });
      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.clear();
      await refresh(); // no house any more → onboarding
    },
  });
}

/** Account lifecycle. Each one signs out afterwards (except cancel/resume). */
export function useAccountActions() {
  const { signOut } = useAuth();
  const { refresh } = useHousehold();

  const pause = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('pause_account');
      if (error) throw error;
    },
    onSuccess: () => signOut(),
  });

  const resume = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('resume_account');
      if (error) throw error;
    },
    onSuccess: () => refresh(),
  });

  const requestDeletion = useMutation({
    mutationFn: async (immediate: boolean) => {
      const { error } = await supabase.rpc('request_account_deletion', { p_immediate: immediate });
      if (error) throw error;
    },
    onSuccess: () => signOut(),
  });

  const cancelDeletion = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('cancel_account_deletion');
      if (error) throw error;
    },
    onSuccess: () => refresh(),
  });

  return { pause, resume, requestDeletion, cancelDeletion };
}

export function useSendBirthdayWish() {
  const { household } = useHousehold();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (toUser: string) => {
      if (!household) throw new Error('no_household');
      const { error } = await supabase.rpc('send_birthday_wish', { p_household: household.id, p_to: toUser });
      if (error) throw error;
    },
    onSettled: () => {
      if (household) queryClient.invalidateQueries({ queryKey: qk.activity(household.id) });
    },
  });
}
