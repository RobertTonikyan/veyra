import { useQuery } from '@tanstack/react-query';

import { qk } from '@/services/queryKeys';
import { supabase } from '@/services/supabase';

import { useHousehold } from './HouseholdProvider';

export type Member = {
  user_id: string;
  role: string;
  color_index: number;
  display_name: string;
};

/** Everyone in the current household, in join order. */
export function useMembers() {
  const { household } = useHousehold();
  const hid = household?.id ?? '';

  return useQuery({
    queryKey: qk.members(hid),
    enabled: !!hid,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase
        .from('household_members')
        .select('user_id, role, color_index, joined_at, profiles ( display_name )')
        .eq('household_id', hid)
        .order('joined_at', { ascending: true });
      if (error) throw error;

      return data.map((m) => ({
        user_id: m.user_id,
        role: m.role,
        color_index: m.color_index,
        display_name: m.profiles?.display_name ?? '',
      }));
    },
  });
}

/** Lookup helper: user id → member (or undefined). */
export function useMemberMap() {
  const { data } = useMembers();
  return new Map((data ?? []).map((m) => [m.user_id, m]));
}
