import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { qk } from '@/services/queryKeys';
import { supabase } from '@/services/supabase';

import { useHousehold } from './HouseholdProvider';

// Tables in the supabase_realtime publication.
const TABLES = [
  'shopping_items',
  'chores',
  'chore_logs',
  'kudos',
  'expenses',
  'settlements',
  'events',
  'meal_plan',
  'notes',
  'goals',
  'activity',
] as const;

/**
 * Listens to database changes for the current household and refreshes the
 * matching queries, so what one person does shows up for everyone at once.
 * RLS still applies: you only receive rows you're allowed to read.
 */
export function RealtimeSync() {
  const { household } = useHousehold();
  const queryClient = useQueryClient();
  const hid = household?.id;

  useEffect(() => {
    if (!hid) return;

    const channel = supabase.channel(`household:${hid}`);

    for (const table of TABLES) {
      const refresh = () => {
        queryClient.invalidateQueries({ queryKey: qk.table(hid, table) });
        // balances, settle-up and monthly totals are built from both of these
        if (table === 'expenses' || table === 'settlements') {
          queryClient.invalidateQueries({ queryKey: qk.money(hid) });
        }
      };

      // Inserts and updates can be filtered to this house.
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter: `household_id=eq.${hid}` },
        refresh,
      );
      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table, filter: `household_id=eq.${hid}` },
        refresh,
      );
      // Realtime can't filter deletes, so any delete on the table triggers a refresh.
      channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, refresh);
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hid, queryClient]);

  return null;
}
