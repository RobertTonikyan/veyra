import { useRouter, type Href } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ReceiptText,
  ShoppingBasket,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import {
  WEEKLY_GOAL_PER_MEMBER,
  useChores,
  useCompleteChore,
  useScores,
  useSnoozeChore,
  type Chore,
} from '@/features/chores/api';
import { sectionOf } from '@/features/chores/dates';
import { ActivityFeed } from '@/features/home/ActivityFeed';
import { useBalances, useMonthTotal } from '@/features/money/api';
import { formatMoney, monthOf } from '@/features/money/format';
import { useShoppingItems } from '@/features/shopping/api';
import { useHousehold } from '@/household/HouseholdProvider';
import { useMembers } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { Avatar, Button, Card, Fab, Screen, Sheet, Text, colors, radius, space } from '@/ui';

function greetingKey(hour: number) {
  if (hour >= 5 && hour < 12) return 'home.greetMorning';
  if (hour >= 12 && hour < 17) return 'home.greetNoon';
  if (hour >= 17 && hour < 22) return 'home.greetEvening';
  return 'home.greetNight';
}

export default function HomeScreen() {
  const { t, isRTL, language } = useI18n();
  const router = useRouter();
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  const { household, profile } = useHousehold();
  const { data: members = [] } = useMembers();
  const meMember = members.find((m) => m.user_id === me);

  const { data: chores = [] } = useChores();
  const { data: items = [] } = useShoppingItems();
  const { data: scores = [] } = useScores('week');
  const { data: balances } = useBalances();
  const { data: monthTotal = 0 } = useMonthTotal(monthOf());
  const completeChore = useCompleteChore();
  const snoozeChore = useSnoozeChore();

  const [quickAdd, setQuickAdd] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const onError = (e: unknown) => setNotice(t(dbErrorKey(e)));
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  // ---- what needs attention ----
  const mineOrAnyone = (c: Chore) => c.is_joint || c.assignee === null || c.assignee === me;
  const overdue = chores.filter((c) => sectionOf(c.due_date) === 'overdue');
  const today = chores.filter((c) => sectionOf(c.due_date) === 'today');
  const myToday = today.filter(mineOrAnyone);
  // the house asks: oldest overdue first (anyone can rescue it), else my next chore today
  const ask = overdue[0] ?? myToday[0] ?? null;
  const askIsRescue = !!ask && sectionOf(ask.due_date) === 'overdue' && !!ask.assignee && ask.assignee !== me;
  const askPoints = ask ? (askIsRescue ? Math.ceil(ask.effort * 1.5) : ask.effort) : 0;
  const askOwner = ask?.assignee ? members.find((m) => m.user_id === ask.assignee) : undefined;

  const openItems = items.filter((i) => !i.checked_at).length;
  const myBalance = balances?.get(me) ?? 0;
  const budget = household?.monthly_budget_agorot ?? null;

  const teamPoints = scores.reduce((sum, s) => sum + s.points, 0);
  const teamGoal = WEEKLY_GOAL_PER_MEMBER * Math.max(members.length, 1);
  const daysLeftInWeek = 6 - new Date().getDay(); // week ends Saturday

  const go = (href: Href) => router.navigate(href);

  function completeAsk() {
    if (!ask) return;
    setNotice(null);
    completeChore.mutate(
      { chore: ask },
      { onSuccess: (pts) => setNotice(t('chores.done', { points: pts ?? askPoints })), onError },
    );
  }

  const dateLine = (() => {
    try {
      return new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    } catch {
      return '';
    }
  })();

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        {/* ---------- greeting ---------- */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="small" color="textMuted">
              {members.length > 2 && household
                ? t('home.houseLine', { name: household.name, count: members.length })
                : dateLine}
            </Text>
            <Text variant="display" accessibilityRole="header">
              {t(greetingKey(new Date().getHours()), { name: profile?.display_name ?? '' })}
            </Text>
          </View>
          {meMember ? <Avatar name={meMember.display_name} colorIndex={meMember.color_index} size={44} /> : null}
        </View>

        {/* ---------- the house asks ---------- */}
        {ask ? (
          <Card tone="accent" style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Sparkles size={16} color={colors.accent} />
              <Text variant="label" color="accent">
                {t('home.houseAsks')}
              </Text>
            </View>
            <Text variant="title">
              {askIsRescue
                ? t('home.askRescue', { title: ask.title, name: askOwner?.display_name ?? '' })
                : sectionOf(ask.due_date) === 'overdue'
                  ? t('home.askOverdue', { title: ask.title })
                  : t('home.askToday', { title: ask.title })}
            </Text>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Button
                label={t('home.onIt', { points: askPoints })}
                loading={completeChore.isPending}
                onPress={completeAsk}
              />
              {ask.snooze_count < 2 ? (
                <Button
                  variant="ghost"
                  label={t('home.snoozeTomorrow')}
                  onPress={() => snoozeChore.mutate(ask, { onError })}
                />
              ) : null}
            </View>
          </Card>
        ) : (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <CircleCheck size={22} color={colors.sage} />
            <Text style={{ flex: 1 }} color="textSoft">
              {t('home.allClear')}
            </Text>
          </Card>
        )}

        {notice ? (
          <Text variant="small" color="sage" accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}

        {/* ---------- three numbers ---------- */}
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <StatTile
            value={String(myToday.length)}
            label={members.length > 2 ? t('home.myChoresToday') : t('home.choresToday')}
            onPress={() => go('/chores')}
          />
          <StatTile value={String(openItems)} label={t('home.onTheList')} onPress={() => go('/shopping')} />
          <StatTile
            value={
              budget
                ? formatMoney(Math.max(budget - monthTotal, 0))
                : myBalance === 0
                  ? '✓'
                  : formatMoney(Math.abs(myBalance))
            }
            label={
              budget
                ? t('home.leftInBudget')
                : myBalance > 0
                  ? t('home.owedToYou')
                  : myBalance < 0
                    ? t('home.youOwe')
                    : t('home.balanced')
            }
            tone={!budget && myBalance < 0 ? 'rose' : undefined}
            onPress={() => go('/money')}
          />
        </View>

        {/* ---------- weekly team goal ---------- */}
        {members.length > 0 ? (
          <Pressable
            onPress={() => go('/chores')}
            accessibilityRole="button"
            accessibilityLabel={`${t('home.weeklyGoal')}: ${t('chores.teamProgress', { points: teamPoints, goal: teamGoal })}`}
          >
            <Card style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Text variant="label" color="textMuted" style={{ flex: 1 }}>
                  {members.length > 2 ? t('home.weeklyGoalGroup') : t('home.weeklyGoal')}
                </Text>
                <Text variant="small" color="textMuted">
                  {t('home.daysLeft', { count: Math.max(daysLeftInWeek, 0) })}
                </Text>
                <Chevron size={16} color={colors.textMuted} />
              </View>
              {household?.weekly_reward ? <Text variant="title">{household.weekly_reward}</Text> : null}
              <View style={{ gap: space.xs }}>
                <View
                  style={{ height: 10, borderRadius: radius.pill, backgroundColor: colors.sunken, overflow: 'hidden' }}
                >
                  <View
                    style={{
                      width: `${Math.min(teamPoints / teamGoal, 1) * 100}%`,
                      height: '100%',
                      borderRadius: radius.pill,
                      backgroundColor: colors.accent,
                    }}
                  />
                </View>
                <Text variant="small" color="textSoft">
                  {t('chores.teamProgress', { points: teamPoints, goal: teamGoal })}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
                {scores.slice(0, 6).map((s) => {
                  const m = members.find((x) => x.user_id === s.user_id);
                  if (!m) return null;
                  return (
                    <View key={s.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                      <Avatar name={m.display_name} colorIndex={m.color_index} size={24} />
                      <Text variant="small" weight="semibold">
                        {s.points}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          </Pressable>
        ) : null}

        {/* ---------- rest of today ---------- */}
        {myToday.filter((c) => c.id !== ask?.id).length > 0 ? (
          <View style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="label" color="textMuted" style={{ flex: 1 }} accessibilityRole="header">
                {t('home.restOfToday')}
              </Text>
              <Button variant="ghost" label={t('home.allChores')} onPress={() => go('/chores')} />
            </View>
            <Card padded={false}>
              {myToday
                .filter((c) => c.id !== ask?.id)
                .slice(0, 3)
                .map((c, i) => (
                  <Pressable
                    key={c.id}
                    onPress={() => completeChore.mutate({ chore: c }, { onError })}
                    accessibilityRole="button"
                    accessibilityLabel={t('chores.markDone', { title: c.title })}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      minHeight: 56,
                      paddingHorizontal: space.lg,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.hairline,
                      backgroundColor: pressed ? colors.raised : 'transparent',
                    })}
                  >
                    <View
                      style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border }}
                    />
                    <Text style={{ flex: 1 }}>{c.title}</Text>
                    <Text variant="small" color="textMuted">
                      {t('chores.points', { points: c.effort })}
                    </Text>
                  </Pressable>
                ))}
            </Card>
          </View>
        ) : null}

        {/* ---------- activity ---------- */}
        <ActivityFeed me={me} members={members} />
      </Screen>

      <Fab accessibilityLabel={t('quickAdd.open')} onPress={() => setQuickAdd(true)} />

      <Sheet visible={quickAdd} onClose={() => setQuickAdd(false)} title={t('quickAdd.title')}>
        <View style={{ gap: space.sm }}>
          <QuickAction
            Icon={ShoppingBasket}
            label={t('quickAdd.item')}
            onPress={() => {
              setQuickAdd(false);
              go({ pathname: '/shopping', params: { add: String(Date.now()) } });
            }}
          />
          <QuickAction
            Icon={CircleCheck}
            label={t('quickAdd.chore')}
            onPress={() => {
              setQuickAdd(false);
              go({ pathname: '/chores', params: { add: String(Date.now()) } });
            }}
          />
          <QuickAction
            Icon={ReceiptText}
            label={t('quickAdd.expense')}
            onPress={() => {
              setQuickAdd(false);
              go({ pathname: '/money', params: { add: String(Date.now()) } });
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

// ---------- small pieces ----------

function StatTile({
  value,
  label,
  tone,
  onPress,
}: {
  value: string;
  label: string;
  tone?: 'rose';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : 1 })}
    >
      <Card style={{ gap: 2, minHeight: 92, justifyContent: 'center' }}>
        <Text
          variant="title"
          color={tone === 'rose' ? 'roseText' : 'text'}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ writingDirection: 'ltr' }}
        >
          {value}
        </Text>
        <Text variant="small" color="textMuted" numberOfLines={2}>
          {label}
        </Text>
      </Card>
    </Pressable>
  );
}

function QuickAction({ Icon, label, onPress }: { Icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Button
      variant="secondary"
      label={label}
      icon={<Icon size={20} color={colors.text} />}
      onPress={onPress}
      fullWidth
    />
  );
}

