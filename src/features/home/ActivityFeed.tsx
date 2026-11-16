import { HandHeart } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { formatMoney } from '@/features/money/format';
import type { Member } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { Avatar, Card, Text, colors, radius, space } from '@/ui';

import { useActivityFeed, useGiveKudos, useKudosGiven, type FeedEntry } from './api';

type T = (key: string, params?: Record<string, string | number>) => string;

function ago(t: T, iso: string, language: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return t('home.ago.now');
  if (minutes < 60) return t('home.ago.minutes', { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t('home.ago.hours', { count: hours });
  if (hours < 48) return t('home.ago.yesterday');
  try {
    return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function describe(t: T, entry: FeedEntry, name: (id: string | null) => string): string {
  const p = (entry.payload ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const num = (v: unknown) => (typeof v === 'number' ? v : 0);
  const who = name(entry.actor);

  switch (entry.kind) {
    case 'shopping_added':
      return entry.count > 1
        ? t('home.feed.shoppingMany', { name: who, count: entry.count })
        : t('home.feed.shoppingOne', { name: who, item: str(p.name) });
    case 'chore_done':
      return t(p.rescue ? 'home.feed.choreRescue' : 'home.feed.chore', { name: who, title: str(p.title) });
    case 'expense_added':
      return t('home.feed.expense', { name: who, amount: formatMoney(num(p.amount_agorot)), title: str(p.title) });
    case 'settled':
      return t('home.feed.settled', { name: who, to: name(str(p.to)), amount: formatMoney(num(p.amount_agorot)) });
    case 'member_joined':
      return t('home.feed.joined', { name: who });
    case 'kudos':
      return t('home.feed.kudos', { name: who, to: name(str(p.to)) });
    case 'birthday':
      return t('home.feed.birthday', { name: who });
    case 'birthday_wish':
      return t('home.feed.birthdayWish', { name: who, to: name(str(p.to)) });
    default:
      return who;
  }
}

export function ActivityFeed({ me, members }: { me: string; members: Member[] }) {
  const { t, language } = useI18n();
  const { data: feed = [] } = useActivityFeed();
  const { data: clapped } = useKudosGiven();
  const giveKudos = useGiveKudos();

  if (feed.length === 0) return null;

  const byId = new Map(members.map((m) => [m.user_id, m]));
  const name = (id: string | null) =>
    !id ? '?' : id === me ? t('money.me') : (byId.get(id)?.display_name ?? t('home.someone'));

  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label" color="textMuted" accessibilityRole="header">
        {t('home.whatHappened')}
      </Text>
      <Card padded={false}>
        {feed.map((entry, i) => {
          const actor = entry.actor ? byId.get(entry.actor) : undefined;
          const p = (entry.payload ?? {}) as Record<string, unknown>;
          const canClap = entry.kind === 'chore_done' && !!entry.ref_id && !!entry.actor && entry.actor !== me;
          const done = canClap && clapped?.has(entry.ref_id!);
          const text = describe(t, entry, name);
          const points = entry.kind === 'chore_done' && typeof p.points === 'number' ? ` · +${p.points}` : '';

          return (
            <View
              key={entry.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                minHeight: 60,
                paddingHorizontal: space.lg,
                paddingVertical: space.sm,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.hairline,
              }}
            >
              {actor ? <Avatar name={actor.display_name} colorIndex={actor.color_index} size={30} /> : null}
              <View style={{ flex: 1, gap: 2 }} accessible>
                <Text variant="small">{text}</Text>
                <Text variant="small" color="textMuted">
                  {ago(t, entry.created_at, language)}
                  {points}
                </Text>
              </View>
              {canClap ? (
                <Pressable
                  disabled={done}
                  onPress={() => giveKudos.mutate({ logId: entry.ref_id!, toUser: entry.actor! })}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: done }}
                  accessibilityLabel={done ? t('home.thanked') : t('home.thankNamed', { name: name(entry.actor) })}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.xs,
                    minHeight: 36,
                    paddingHorizontal: space.md,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: done ? 'rgba(156,198,163,0.4)' : colors.border,
                    backgroundColor: done ? 'rgba(156,198,163,0.12)' : pressed ? colors.raised : 'transparent',
                  })}
                >
                  <HandHeart size={16} color={done ? colors.sage : colors.textSoft} />
                  <Text variant="small" color={done ? 'sage' : 'textSoft'}>
                    {done ? t('home.thanked') : t('home.thank')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </Card>
    </View>
  );
}
