import { CircleCheck, PartyPopper } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { AddChoreSheet } from '@/features/chores/AddChoreSheet';
import {
  useAddChore,
  useChores,
  useCompleteChore,
  useDeleteChore,
  useSnoozeChore,
  type Chore,
} from '@/features/chores/api';
import { ChoreRow } from '@/features/chores/ChoreRow';
import { sectionOf, type Section } from '@/features/chores/dates';
import { Leaderboard } from '@/features/chores/Leaderboard';
import { useMembers } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Fab,
  Screen,
  Sheet,
  TAB_BAR_HEIGHT,
  Text,
  colors,
  radius,
  space,
  tabBarBottomOffset,
} from '@/ui';

type Filter = 'all' | 'mine' | 'joint' | `member:${string}`;
const SECTIONS: Section[] = ['overdue', 'today', 'soon', 'anytime'];

export default function ChoresScreen() {
  const { t } = useI18n();
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  const { data: members = [] } = useMembers();

  const { data: chores = [], isPending, isError, refetch } = useChores();
  const addChore = useAddChore();
  const completeChore = useCompleteChore();
  const snoozeChore = useSnoozeChore();
  const deleteChore = useDeleteChore();

  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(false);
  const [jointFor, setJointFor] = useState<Chore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const others = members.filter((m) => m.user_id !== me);

  // ---- filter + sections ----
  const visible = chores.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'mine') return c.assignee === me || c.assignee === null || c.is_joint;
    if (filter === 'joint') return c.is_joint;
    return c.assignee === filter.slice('member:'.length);
  });
  const bySection = SECTIONS.map((s) => ({ section: s, items: visible.filter((c) => sectionOf(c.due_date) === s) })).filter(
    (g) => g.items.length > 0,
  );
  const todayCount = chores.filter((c) => sectionOf(c.due_date) === 'today').length;
  const lateCount = chores.filter((c) => sectionOf(c.due_date) === 'overdue').length;

  // ---- actions ----
  const onError = (e: unknown) => setError(t(dbErrorKey(e)));

  function complete(chore: Chore, withUsers: string[] = []) {
    setError(null);
    completeChore.mutate(
      { chore, withUsers },
      {
        onSuccess: (points) => {
          const isRescue = !!chore.assignee && chore.assignee !== me && sectionOf(chore.due_date) === 'overdue';
          toast.show(t(isRescue ? 'chores.doneRescue' : 'chores.done', { points: points ?? chore.effort }));
        },
        onError,
      },
    );
  }

  function onComplete(chore: Chore) {
    // Joint chore in a house with others: ask who did it together.
    if (chore.is_joint && others.length > 0) setJointFor(chore);
    else complete(chore);
  }

  const filters: { value: Filter; label: string; colorIndex?: number }[] = [
    { value: 'all', label: t('chores.filter.all') },
    { value: 'mine', label: t('chores.filter.mine') },
    ...others.slice(0, 6).map((m) => ({ value: `member:${m.user_id}` as Filter, label: m.display_name, colorIndex: m.color_index })),
    { value: 'joint', label: t('chores.filter.joint') },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        {/* header */}
        <View style={{ gap: 2 }}>
          <Text variant="small" color={lateCount > 0 ? 'roseText' : 'textMuted'}>
            {t('chores.todayCount', { count: todayCount })}
            {lateCount > 0 ? ` · ${t('chores.lateCount', { count: lateCount })}` : ''}
          </Text>
          <Text variant="display" accessibilityRole="header">
            {t('tabs.chores')}
          </Text>
        </View>

        {members.length > 0 ? <Leaderboard members={members} /> : null}

        {/* filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm }}
          accessibilityRole="tablist"
        >
          {filters.map((f) => {
            const selected = filter === f.value;
            return (
              <Pressable
                key={f.value}
                onPress={() => setFilter(f.value)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.xs,
                  minHeight: 38,
                  paddingStart: f.colorIndex !== undefined ? space.xs : space.md,
                  paddingEnd: space.md,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: selected ? 'rgba(240,138,108,0.14)' : pressed ? colors.raised : colors.surface,
                })}
              >
                {f.colorIndex !== undefined ? <Avatar name={f.label} colorIndex={f.colorIndex} size={26} /> : null}
                <Text variant="small" weight={selected ? 'semibold' : 'regular'} color={selected ? 'accent' : 'textSoft'}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {error ? (
          <Text variant="small" color="roseText" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        {/* list */}
        {isPending ? (
          <ActivityIndicator color={colors.accent} accessibilityLabel={t('common.loading')} />
        ) : isError ? (
          <Card style={{ gap: space.md, alignItems: 'center' }}>
            <Text align="center">{t('errors.loadFailed')}</Text>
            <Button variant="secondary" label={t('common.retry')} onPress={() => refetch()} />
          </Card>
        ) : bySection.length === 0 ? (
          <EmptyState
            Icon={CircleCheck}
            title={chores.length === 0 ? t('chores.emptyTitle') : t('chores.filterEmpty')}
            body={chores.length === 0 ? t('chores.emptyBody') : undefined}
          />
        ) : (
          bySection.map(({ section, items }) => (
            <View key={section} style={{ gap: space.sm }}>
              <Text
                variant="label"
                color={section === 'overdue' ? 'roseText' : 'textMuted'}
                accessibilityRole="header"
              >
                {t(`chores.section.${section}`)}
              </Text>
              <Card padded={false}>
                {items.map((chore, i) => (
                  <ChoreRow
                    key={chore.id}
                    chore={chore}
                    me={me}
                    members={members}
                    first={i === 0}
                    onComplete={onComplete}
                    onSnooze={(c) => snoozeChore.mutate(c, { onError })}
                    onDelete={(c) => deleteChore.mutate(c, { onError })}
                  />
                ))}
              </Card>
            </View>
          ))
        )}
      </Screen>

      <Fab accessibilityLabel={t('chores.addTitle')} onPress={() => setAdding(true)} />

      <AddChoreSheet
        visible={adding}
        members={members}
        onClose={() => setAdding(false)}
        onSubmit={(chore) => addChore.mutate(chore, { onError })}
      />

      <WhoHelpedSheet
        chore={jointFor}
        others={others}
        onClose={() => setJointFor(null)}
        onConfirm={(chore, withUsers) => {
          setJointFor(null);
          complete(chore, withUsers);
        }}
      />

      {toast.node}
    </View>
  );
}

// ---------- "who did it with you?" for joint chores ----------

function WhoHelpedSheet({
  chore,
  others,
  onClose,
  onConfirm,
}: {
  chore: Chore | null;
  others: { user_id: string; display_name: string; color_index: number }[];
  onClose: () => void;
  onConfirm: (chore: Chore, withUsers: string[]) => void;
}) {
  const { t } = useI18n();
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (chore) setPicked(others.map((o) => o.user_id)); // default: everyone
  }, [chore?.id]);

  if (!chore) return null;

  return (
    <Sheet visible onClose={onClose} title={t('chores.whoHelped', { title: chore.title })}>
      <View style={{ gap: space.sm }}>
        {others.map((o) => {
          const on = picked.includes(o.user_id);
          return (
            <Pressable
              key={o.user_id}
              onPress={() => setPicked((p) => (on ? p.filter((id) => id !== o.user_id) : [...p, o.user_id]))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={o.display_name}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                minHeight: 52,
                paddingHorizontal: space.md,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: on ? colors.accent : colors.hairline,
                backgroundColor: pressed ? colors.raised : colors.sunken,
              })}
            >
              <Avatar name={o.display_name} colorIndex={o.color_index} size={30} />
              <Text style={{ flex: 1 }}>{o.display_name}</Text>
              <Text color={on ? 'accent' : 'textMuted'}>{on ? '✓' : ''}</Text>
            </Pressable>
          );
        })}
        <Text variant="small" color="textMuted">
          {t('chores.whoHelpedHint', { points: chore.effort })}
        </Text>
      </View>
      <Button label={t('chores.markDoneShort')} onPress={() => onConfirm(chore, picked)} fullWidth />
    </Sheet>
  );
}

// ---------- tiny celebration toast ----------

function useToast() {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show(text: string) {
    setMessage(text);
    AccessibilityInfo.announceForAccessibility(text);
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setMessage(null));
    }, 2200);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const node = message ? (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        start: space.xl,
        end: space.xl,
        bottom: tabBarBottomOffset(insets.bottom) + TAB_BAR_HEIGHT + 90,
        opacity,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        borderRadius: radius.lg,
        backgroundColor: colors.raised,
        borderWidth: 1,
        borderColor: 'rgba(156,198,163,0.4)',
      }}
    >
      <PartyPopper size={20} color={colors.sage} />
      <Text variant="bodyStrong" style={{ flex: 1 }}>
        {message}
      </Text>
    </Animated.View>
  ) : null;

  return { show, node };
}
