import { ArrowLeftRight, ChevronLeft, ChevronRight, Scale, Wallet } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AddExpenseSheet } from '@/features/money/AddExpenseSheet';
import {
  useAddExpense,
  useBalances,
  useDeleteExpense,
  useExpenses,
  useMonthTotal,
  useRecordTransfer,
  useSettleUp,
  type Expense,
} from '@/features/money/api';
import { EXPENSE_CATEGORIES, EXPENSE_COLOR, asExpenseCategory } from '@/features/money/categories';
import { ExpenseIcon } from '@/features/money/ExpenseIcon';
import { dayLabel, formatMoney, monthLabel, monthOf, shiftMonth } from '@/features/money/format';
import { SplitModeCard } from '@/features/money/SplitModeCard';
import { useHousehold } from '@/household/HouseholdProvider';
import { useMembers, type Member } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { Avatar, Button, Card, EmptyState, Fab, Screen, Text, colors, memberColor, radius, space, touch } from '@/ui';

export default function MoneyScreen() {
  const { t, isRTL, language } = useI18n();
  const { session } = useAuth();
  const { household } = useHousehold();
  const me = session?.user.id ?? '';
  const { data: members = [] } = useMembers();
  const byId = new Map(members.map((m) => [m.user_id, m]));
  const nameOf = (id: string) => (id === me ? t('money.me') : (byId.get(id)?.display_name ?? '?'));

  const [month, setMonth] = useState(monthOf());
  const isCurrentMonth = month === monthOf();
  const { data: expenses = [], isPending, isError, refetch } = useExpenses(month);
  const { data: total = 0 } = useMonthTotal(month);
  const { data: prevTotal } = useMonthTotal(shiftMonth(month, -1));
  const { data: balances } = useBalances();
  const { data: transfers = [] } = useSettleUp();

  const addExpense = useAddExpense();
  const deleteExpense = useDeleteExpense();
  const recordTransfer = useRecordTransfer();

  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onError = (e: unknown) => setError(t(dbErrorKey(e)));

  // opened from the home quick-add button
  const { add: quickAdd } = useLocalSearchParams<{ add?: string }>();
  useEffect(() => {
    if (quickAdd) setAdding(true);
  }, [quickAdd]);

  // ---- month numbers ----
  const vsPrev = prevTotal && prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;
  const budget = household?.monthly_budget_agorot ?? null;
  const daysLeft = (() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
  })();

  const paidBy = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    paidBy.set(e.paid_by, (paidBy.get(e.paid_by) ?? 0) + e.amount_agorot);
    const c = asExpenseCategory(e.category);
    byCategory.set(c, (byCategory.get(c) ?? 0) + e.amount_agorot);
  }
  const payers = members
    .map((m) => ({ member: m, amount: paidBy.get(m.user_id) ?? 0 }))
    .sort((a, b) => b.amount - a.amount);
  const maxPaid = Math.max(...payers.map((p) => p.amount), 1);
  const categories = EXPENSE_CATEGORIES.filter((c) => byCategory.has(c)).sort(
    (a, b) => (byCategory.get(b) ?? 0) - (byCategory.get(a) ?? 0),
  );

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  function confirmDelete(expense: Expense) {
    if (expense.created_by !== me && expense.paid_by !== me) {
      setError(t('money.deleteNotYours'));
      return;
    }
    Alert.alert(t('money.deleteTitle', { title: expense.title }), t('money.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteExpense.mutate(expense, { onError }) },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        {/* ---------- header + month switch ---------- */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text variant="display" accessibilityRole="header" style={{ flex: 1 }}>
            {t('tabs.money')}
          </Text>
          <MonthButton label={t('money.prevMonth')} onPress={() => setMonth((m) => shiftMonth(m, -1))}>
            <PrevIcon size={20} color={colors.textSoft} />
          </MonthButton>
          <Text variant="bodyStrong" color="textSoft" accessibilityLiveRegion="polite">
            {monthLabel(month, language)}
          </Text>
          <MonthButton
            label={t('money.nextMonth')}
            disabled={isCurrentMonth}
            onPress={() => setMonth((m) => shiftMonth(m, 1))}
          >
            <NextIcon size={20} color={isCurrentMonth ? colors.border : colors.textSoft} />
          </MonthButton>
        </View>

        {/* ---------- month total ---------- */}
        <Card tone="accent" style={{ gap: space.xs }}>
          <Text variant="label" color="textSoft">
            {members.length > 2 ? t('money.sharedThisMonth') : t('money.spentThisMonth')}
          </Text>
          <Text variant="display" style={{ writingDirection: 'ltr' }}>
            {formatMoney(total)}
          </Text>
          {members.length > 2 ? (
            <Text variant="small" color="textSoft">
              {t('money.perPerson', { count: members.length, amount: formatMoney(Math.round(total / members.length)) })}
            </Text>
          ) : null}
          {vsPrev !== null ? (
            <Text variant="small" color={vsPrev > 0 ? 'roseText' : 'sage'}>
              {vsPrev > 0
                ? t('money.moreThanLast', { pct: vsPrev })
                : vsPrev < 0
                  ? t('money.lessThanLast', { pct: -vsPrev })
                  : t('money.sameAsLast')}
            </Text>
          ) : null}
          {budget && isCurrentMonth ? (
            <View style={{ gap: space.xs, marginTop: space.sm }}>
              <Bar value={total / budget} color={total > budget ? colors.rose : colors.accent} />
              <Text variant="small" color="textSoft">
                {total > budget
                  ? t('money.overBudget', { amount: formatMoney(total - budget), budget: formatMoney(budget) })
                  : t('money.budgetLeft', {
                      budget: formatMoney(budget),
                      left: formatMoney(budget - total),
                      perDay: formatMoney(Math.floor((budget - total) / daysLeft)),
                    })}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* ---------- settle up ---------- */}
        {members.length > 1 ? (
          <Card style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Scale size={18} color={colors.textMuted} />
              <Text variant="label" color="textMuted" style={{ flex: 1 }}>
                {transfers.length === 0
                  ? t('money.balanced')
                  : t('money.transfersNeeded', { count: transfers.length })}
              </Text>
            </View>

            {transfers.map((tr) => {
              const involvesMe = tr.from_user === me || tr.to_user === me;
              const from = byId.get(tr.from_user);
              const to = byId.get(tr.to_user);
              return (
                <View
                  key={`${tr.from_user}-${tr.to_user}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
                  accessible
                  accessibilityLabel={t('money.transferA11y', {
                    from: nameOf(tr.from_user),
                    to: nameOf(tr.to_user),
                    amount: formatMoney(tr.amount_agorot),
                  })}
                >
                  {from ? <Avatar name={from.display_name} colorIndex={from.color_index} size={28} /> : null}
                  <ArrowLeftRight size={14} color={colors.textMuted} />
                  {to ? <Avatar name={to.display_name} colorIndex={to.color_index} size={28} /> : null}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="small" color="textSoft" numberOfLines={1}>
                      {tr.from_user === me
                        ? t('money.youPay', { name: nameOf(tr.to_user) })
                        : tr.to_user === me
                          ? t('money.paysYou', { name: nameOf(tr.from_user) })
                          : t('money.paysTo', { from: nameOf(tr.from_user), to: nameOf(tr.to_user) })}
                    </Text>
                    <Text variant="bodyStrong" style={{ writingDirection: 'ltr' }}>
                      {formatMoney(tr.amount_agorot)}
                    </Text>
                  </View>
                  {involvesMe ? (
                    <Button
                      variant="secondary"
                      label={t('money.markPaid')}
                      loading={recordTransfer.isPending}
                      onPress={() =>
                        Alert.alert(
                          t('money.markPaidTitle'),
                          t('money.markPaidBody', {
                            from: nameOf(tr.from_user),
                            to: nameOf(tr.to_user),
                            amount: formatMoney(tr.amount_agorot),
                          }),
                          [
                            { text: t('common.cancel'), style: 'cancel' },
                            { text: t('money.markPaid'), onPress: () => recordTransfer.mutate(tr, { onError }) },
                          ],
                        )
                      }
                    />
                  ) : null}
                </View>
              );
            })}

            {balances && balances.get(me) ? (
              <Text variant="small" color="textMuted">
                {(balances.get(me) ?? 0) > 0
                  ? t('money.myBalancePlus', { amount: formatMoney(balances.get(me) ?? 0) })
                  : t('money.myBalanceMinus', { amount: formatMoney(-(balances.get(me) ?? 0)) })}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {/* ---------- split mode (couples & groups) ---------- */}
        {members.length > 1 ? <SplitModeCard members={members} /> : null}

        {error ? (
          <Text variant="small" color="roseText" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        {isPending ? (
          <ActivityIndicator color={colors.accent} accessibilityLabel={t('common.loading')} />
        ) : isError ? (
          <Card style={{ gap: space.md, alignItems: 'center' }}>
            <Text align="center">{t('errors.loadFailed')}</Text>
            <Button variant="secondary" label={t('common.retry')} onPress={() => refetch()} />
          </Card>
        ) : expenses.length === 0 ? (
          <EmptyState Icon={Wallet} title={t('money.emptyTitle')} body={t('money.emptyBody')} />
        ) : (
          <>
            {/* ---------- who paid ---------- */}
            {members.length > 1 ? (
              <Section title={t('money.whoPaid')}>
                <Card style={{ gap: space.md }}>
                  {payers.map(({ member, amount }) => (
                    <PayerRow key={member.user_id} member={member} amount={amount} max={maxPaid} me={me} t={t} />
                  ))}
                </Card>
              </Section>
            ) : null}

            {/* ---------- by category ---------- */}
            <Section title={t('money.byCategory')}>
              <Card style={{ gap: space.md }}>
                {categories.map((c) => {
                  const amount = byCategory.get(c) ?? 0;
                  return (
                    <View key={c} style={{ gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                        <ExpenseIcon category={c} size={28} />
                        <Text style={{ flex: 1 }}>{t(`money.categories.${c}`)}</Text>
                        <Text variant="bodyStrong" style={{ writingDirection: 'ltr' }}>
                          {formatMoney(amount)}
                        </Text>
                      </View>
                      <Bar value={total ? amount / total : 0} color={EXPENSE_COLOR[c]} />
                    </View>
                  );
                })}
              </Card>
            </Section>

            {/* ---------- recent ---------- */}
            <Section title={t('money.recent')}>
              <Card padded={false}>
                {expenses.map((e, i) => {
                  const c = asExpenseCategory(e.category);
                  const meta = [
                    dayLabel(e.spent_on, language, t),
                    members.length > 1 ? nameOf(e.paid_by) : null,
                    members.length > 1 && e.participants < members.length
                      ? t('money.splitWith', { count: e.participants })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <Pressable
                      key={e.id}
                      onLongPress={() => confirmDelete(e)}
                      accessibilityRole="text"
                      accessibilityLabel={`${e.title}, ${formatMoney(e.amount_agorot)}, ${meta}`}
                      accessibilityActions={[{ name: 'delete', label: t('common.delete') }]}
                      onAccessibilityAction={(ev) => {
                        if (ev.nativeEvent.actionName === 'delete') confirmDelete(e);
                      }}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space.md,
                        minHeight: 64,
                        paddingHorizontal: space.lg,
                        paddingVertical: space.sm,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: colors.hairline,
                        backgroundColor: pressed ? colors.raised : 'transparent',
                      })}
                    >
                      <ExpenseIcon category={c} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {e.title}
                        </Text>
                        <Text variant="small" color="textMuted" numberOfLines={1}>
                          {meta}
                        </Text>
                      </View>
                      <Text variant="bodyStrong" style={{ writingDirection: 'ltr' }}>
                        {formatMoney(e.amount_agorot)}
                      </Text>
                    </Pressable>
                  );
                })}
              </Card>
            </Section>
          </>
        )}
      </Screen>

      <Fab accessibilityLabel={t('money.addTitle')} onPress={() => setAdding(true)} />

      <AddExpenseSheet
        visible={adding}
        me={me}
        members={members}
        splitMode={household?.split_mode ?? 'equal'}
        onClose={() => setAdding(false)}
        onSubmit={(e) => {
          setError(null);
          addExpense.mutate(e, { onError });
          if (!isCurrentMonth) setMonth(monthOf());
        }}
      />
    </View>
  );
}

// ---------- small pieces ----------

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label" color="textMuted" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function PayerRow({
  member,
  amount,
  max,
  me,
  t,
}: {
  member: Member;
  amount: number;
  max: number;
  me: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <View style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Avatar name={member.display_name} colorIndex={member.color_index} size={28} />
        <Text style={{ flex: 1 }}>{member.user_id === me ? t('money.me') : member.display_name}</Text>
        <Text variant="bodyStrong" style={{ writingDirection: 'ltr' }}>
          {formatMoney(amount)}
        </Text>
      </View>
      <Bar value={amount / max} color={memberColor(member.color_index)} />
    </View>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: colors.sunken, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: radius.pill, backgroundColor: color }} />
    </View>
  );
}

function MonthButton({
  label,
  onPress,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={6}
      style={({ pressed }) => ({
        width: touch.min,
        height: touch.min,
        borderRadius: touch.min / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.raised : 'transparent',
      })}
    >
      {children}
    </Pressable>
  );
}
