import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/AuthProvider';
import { useHousehold } from '@/household/HouseholdProvider';
import { qk } from '@/services/queryKeys';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type ActivityRow = Tables<'activity'>;

/** One line in "what happened at home" — consecutive additions by the same person are merged. */
export type FeedEntry = ActivityRow & { count: number };

function useHouseholdId(): string {
  const { household } = useHousehold();
  if (!household) throw new Error('Home hooks need a household');
  return household.id;
}

export function useActivityFeed(limit = 8) {
  const hid = useHouseholdId();

  return useQuery({
    queryKey: qk.activity(hid),
    queryFn: async (): Promise<FeedEntry[]> => {
      const { data, error } = await supabase
        .from('activity')
        .select('*')
        .eq('household_id', hid)
        .order('created_at', { ascending: false })
        .limit(40);
      if (error) throw error;

      // "Noa added milk", "Noa added eggs", … → "Noa added 3 items" (within 30 minutes)
      const feed: FeedEntry[] = [];
      for (const row of data) {
        const last = feed[feed.length - 1];
        if (
          last &&
          row.kind === 'shopping_added' &&
          last.kind === 'shopping_added' &&
          row.actor === last.actor &&
          new Date(last.created_at).getTime() - new Date(row.created_at).getTime() < 30 * 60_000
        ) {
          last.count += 1;
          continue;
        }
        feed.push({ ...row, count: 1 });
      }
      return feed.slice(0, limit);
    },
  });
}

/** chore_log ids I already clapped for. */
export function useKudosGiven() {
  const hid = useHouseholdId();
  const { session } = useAuth();
  const me = session?.user.id ?? '';

  return useQuery({
    queryKey: qk.kudosGiven(hid),
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kudos')
        .select('log_id')
        .eq('household_id', hid)
        .eq('from_user', me)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return new Set(data.map((k) => k.log_id));
    },
  });
}

export function useGiveKudos() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();
  const key = qk.kudosGiven(hid);

  return useMutation({
    mutationFn: async ({ logId, toUser }: { logId: string; toUser: string }) => {
      const { error } = await supabase.from('kudos').insert({ household_id: hid, log_id: logId, to_user: toUser });
      // 23505 = already clapped (unique) — treat as success
      if (error && error.code !== '23505') throw error;
    },
    onMutate: async ({ logId }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Set<string>>(key);
      queryClient.setQueryData<Set<string>>(key, new Set([...(previous ?? []), logId]));
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
