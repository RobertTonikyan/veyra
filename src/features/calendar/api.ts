import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useHousehold } from '@/household/HouseholdProvider';
import { qk } from '@/services/queryKeys';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type HouseEvent = Tables<'events'>;

function useHouseholdId(): string {
  const { household } = useHousehold();
  if (!household) throw new Error('Calendar hooks need a household');
  return household.id;
}

/** Events that start between two local dates (YYYY-MM-DD, end exclusive). */
export function useEvents(from: string, to: string) {
  const hid = useHouseholdId();

  return useQuery({
    queryKey: qk.events(hid, from),
    queryFn: async () => {
      const [fy, fm, fd] = from.split('-').map(Number);
      const [ty, tm, td] = to.split('-').map(Number);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('household_id', hid)
        .gte('starts_at', new Date(fy, fm - 1, fd).toISOString())
        .lt('starts_at', new Date(ty, tm - 1, td).toISOString())
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export type EventInput = {
  id?: string;
  title: string;
  starts_at: string; // ISO
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
};

export function useSaveEvent() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...e }: EventInput) => {
      if (id) {
        const { error } = await supabase.from('events').update(e).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('events').insert({ household_id: hid, ...e });
        if (error) throw error;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.table(hid, 'events') }),
  });
}

export function useDeleteEvent() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.table(hid, 'events') }),
  });
}
