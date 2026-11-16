import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/AuthProvider';
import { useHousehold, type SplitMode } from '@/household/HouseholdProvider';
import { qk } from '@/services/queryKeys';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

import type { ExpenseCategory } from './categories';
import { monthRange } from './format';

export type Expense = Tables<'expenses'> & { participants: number };

function useHouseholdId(): string {
  const { household } = useHousehold();
  if (!household) throw new Error('Money hooks need a household');
  return household.id;
}

// ---------- read ----------------------------------------------------------

/** Expenses of one month ('YYYY-MM'), newest first, with how many people share each. */
export function useExpenses(month: string) {
  const hid = useHouseholdId();
  const { from, to } = monthRange(month);

  return useQuery({
    queryKey: qk.expenses(hid, month),
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, expense_shares ( user_id )')
        .eq('household_id', hid)
        .gte('spent_on', from)
        .lt('spent_on', to)
        .order('spent_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(({ expense_shares, ...e }) => ({ ...e, participants: expense_shares.length }));
    },
  });
}

/** Total spent in a month (all categories). */
export function useMonthTotal(month: string) {
  const hid = useHouseholdId();

  return useQuery({
    queryKey: qk.monthSpend(hid, month),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('month_spend')
        .select('total_agorot')
        .eq('household_id', hid)
        .eq('month', `${month}-01`);
      if (error) throw error;
      return data.reduce((sum, row) => sum + (row.total_agorot ?? 0), 0);
    },
  });
}

/** user_id → balance in agorot (positive = the house owes them). */
export function useBalances() {
  const hid = useHouseholdId();

  return useQuery({
    queryKey: qk.balances(hid),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('balances')
        .select('user_id, balance_agorot')
        .eq('household_id', hid);
      if (error) throw error;
      return new Map(data.filter((b) => b.user_id).map((b) => [b.user_id!, b.balance_agorot ?? 0]));
    },
  });
}

export type Transfer = { from_user: string; to_user: string; amount_agorot: number };

/** The fewest transfers that bring everyone to zero (computed on the server). */
export function useSettleUp() {
  const hid = useHouseholdId();

  return useQuery({
    queryKey: qk.settleUp(hid),
    queryFn: async (): Promise<Transfer[]> => {
      const { data, error } = await supabase.rpc('suggest_settlements', { p_household: hid });
      if (error) throw error;
      return data;
    },
  });
}

// ---------- write ---------------------------------------------------------

export type NewExpense = {
  title: string;
  amount_agorot: number;
  paid_by: string;
  category: ExpenseCategory;
  spent_on: string; // YYYY-MM-DD
  participants: string[] | null; // null = everyone
};

export function useAddExpense() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (e: NewExpense) => {
      const { data, error } = await supabase.rpc('add_expense', {
        p_household: hid,
        p_title: e.title,
        p_amount_agorot: e.amount_agorot,
        p_paid_by: e.paid_by,
        p_category: e.category,
        p_spent_on: e.spent_on,
        ...(e.participants ? { p_participants: e.participants } : {}),
      });
      if (error) throw error;
      return data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.money(hid) }),
  });
}

export function useDeleteExpense() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: Expense) => {
      const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.money(hid) }),
  });
}

/** Record that a suggested transfer actually happened. */
export function useRecordTransfer() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (t: Transfer) => {
      const { error } = await supabase.from('settlements').insert({
        household_id: hid,
        from_user: t.from_user,
        to_user: t.to_user,
        amount_agorot: t.amount_agorot,
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.money(hid) }),
  });
}

/** Owner only (RLS): switch between equal and percentage split. */
export function useSetSplitMode() {
  const hid = useHouseholdId();
  const { refresh } = useHousehold();

  return useMutation({
    mutationFn: async (mode: SplitMode) => {
      const { error } = await supabase.from('households').update({ split_mode: mode }).eq('id', hid);
      if (error) throw error;
    },
    onSettled: () => refresh(),
  });
}

/** Owner only (RLS): save everyone's percentage. Must add up to 100. */
export function useSetShares() {
  const hid = useHouseholdId();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (shares: { user_id: string; share_percent: number }[]) => {
      if (!session) throw new Error('not_authenticated');
      for (const s of shares) {
        const { error } = await supabase
          .from('household_members')
          .update({ share_percent: s.share_percent })
          .eq('household_id', hid)
          .eq('user_id', s.user_id);
        if (error) throw error;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.members(hid) }),
  });
}
