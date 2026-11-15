import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/services/supabase';

export type HouseholdType = 'couple' | 'roommates' | 'family';
export type SplitMode = 'equal' | 'percent';

export type Profile = {
  id: string;
  display_name: string;
  language: string;
  reminder_time: string;
  reminders_on: boolean;
  status: string;
};

export type Household = {
  id: string;
  name: string;
  type: HouseholdType;
  split_mode: SplitMode;
  timezone: string;
};

export type Membership = {
  role: 'owner' | 'member';
  color_index: number;
};

type HouseholdContextValue = {
  profile: Profile | null;
  household: Household | null;
  membership: Membership | null;
  /** true once data for the signed-in user has been loaded (or failed) */
  ready: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<boolean>;
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

type Data = {
  profile: Profile | null;
  household: Household | null;
  membership: Membership | null;
};

const EMPTY: Data = { profile: null, household: null, membership: null };

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [data, setData] = useState<Data>(EMPTY);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setData(EMPTY);
      setLoadedFor(null);
      setError(false);
      return;
    }

    const [profileRes, memberRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, language, reminder_time, reminders_on, status')
        .eq('id', userId)
        .single(),
      supabase
        .from('household_members')
        .select('role, color_index, households ( id, name, type, split_mode, timezone )')
        .eq('user_id', userId)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    if (profileRes.error || memberRes.error) {
      if (__DEV__) console.warn('[household] load failed', profileRes.error ?? memberRes.error);
      setError(true);
      setLoadedFor(userId);
      return;
    }

    const member = memberRes.data as
      | { role: Membership['role']; color_index: number; households: Household | null }
      | null;

    setData({
      profile: profileRes.data as Profile,
      household: member?.households ?? null,
      membership: member ? { role: member.role, color_index: member.color_index } : null,
    });
    setError(false);
    setLoadedFor(userId);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateDisplayName = useCallback(
    async (name: string) => {
      if (!userId) return false;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: name })
        .eq('id', userId);
      if (updateError) return false;
      setData((d) => (d.profile ? { ...d, profile: { ...d.profile, display_name: name } } : d));
      return true;
    },
    [userId],
  );

  const ready = !userId || loadedFor === userId;

  const value = useMemo<HouseholdContextValue>(
    () => ({ ...data, ready, error, refresh: load, updateDisplayName }),
    [data, ready, error, load, updateDisplayName],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used inside <HouseholdProvider>');
  return ctx;
}
