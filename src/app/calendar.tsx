import { useRouter } from 'expo-router';
import Cake from 'lucide-react-native/icons/cake';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import MapPin from 'lucide-react-native/icons/map-pin';
import UtensilsCrossed from 'lucide-react-native/icons/utensils-crossed';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useEvents, type HouseEvent } from '@/features/calendar/api';
import { EventSheet } from '@/features/calendar/EventSheet';
import { useChores } from '@/features/chores/api';
import { addDays, todayISO, toISODate } from '@/features/chores/dates';
import { useMealPlan } from '@/features/meals/api';
import { daysUntilBirthday } from '@/features/birthdays';
import { useMembers } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { Avatar, BackButton, Card, EmptyState, Fab, Screen, Text, colors, space } from '@/ui';

const RANGE_DAYS = 30;

type Item =
  | { kind: 'event'; key: string; sort: number; event: HouseEvent }
  | { kind: 'birthday'; key: string; sort: number; name: string; colorIndex: number }
  | { kind: 'chore'; key: string; sort: number; title: string; who?: { name: string; colorIndex: number } }
  | { kind: 'dinner'; key: string; sort: number; title: string };

/** One agenda for the next 30 days: events, birthdays, chores due and dinners planned. */
export default function CalendarScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const today = todayISO();
  const end = addDays(today, RANGE_DAYS);

  const { data: events = [] } = useEvents(today, end);
  const { data: chores = [] } = useChores();
  const { data: meals = [] } = useMealPlan(today, end);
  const { data: members = [] } = useMembers();

  const [sheet, setSheet] = useState<{ open: boolean; event: HouseEvent | null }>({ open: false, event: null });

  // ---- build the agenda ----
  const byDay = new Map<string, Item[]>();
  const push = (day: string, item: Item) => byDay.set(day, [...(byDay.get(day) ?? []), item]);

  for (const e of events) {
    push(toISODate(new Date(e.starts_at)), {
      kind: 'event',
      key: `e-${e.id}`,
      sort: e.all_day ? 0 : new Date(e.starts_at).getHours() * 60 + new Date(e.starts_at).getMinutes(),
      event: e,
    });
  }
  for (const m of members) {
    const days = daysUntilBirthday(m.birth_month, m.birth_day);
    if (days !== null && days < RANGE_DAYS) {
      push(addDays(today, days), { kind: 'birthday', key: `b-${m.user_id}`, sort: -1, name: m.display_name, colorIndex: m.color_index });
    }
  }
  for (const c of chores) {
    if (!c.due_date || c.due_date < today || c.due_date >= end) continue;
    const who = members.find((m) => m.user_id === c.assignee);
    push(c.due_date, {
      kind: 'chore',
      key: `c-${c.id}`,
      sort: 2000,
      title: c.title,
      who: who ? { name: who.display_name, colorIndex: who.color_index } : undefined,
    });
  }
  for (const meal of meals) {
    if (meal.slot !== 'dinner') continue;
    push(meal.day, { kind: 'dinner', key: `d-${meal.id}`, sort: 1900, title: meal.recipes?.title ?? meal.title ?? '' });
  }

  const days = [...byDay.keys()].sort();
  if (!byDay.has(today)) days.unshift(today);

  const fmtDay = (iso: string) => {
    if (iso === today) return t('chores.due.today');
    if (iso === addDays(today, 1)) return t('chores.due.tomorrow');
    const [y, m, d] = iso.split('-').map(Number);
    try {
      return new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d));
    } catch {
      return iso;
    }
  };
  const fmtTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
    } catch {
      return '';
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <BackButton label={t('common.back')} onPress={() => router.back()} />
        <Text variant="display" accessibilityRole="header">
          {t('more.calendar')}
        </Text>
        <Text variant="small" color="textMuted">
          {t('calendar.next30')}
        </Text>

        {days.map((day) => {
          const items = (byDay.get(day) ?? []).sort((a, b) => a.sort - b.sort);
          return (
            <View key={day} style={{ gap: space.sm }}>
              <Text
                variant="label"
                color={day === today ? 'accent' : 'textMuted'}
                accessibilityRole="header"
              >
                {fmtDay(day)}
              </Text>
              {items.length === 0 ? (
                <Text variant="small" color="textMuted">
                  {t('calendar.nothingToday')}
                </Text>
              ) : (
                <Card padded={false}>
                  {items.map((item, i) => (
                    <AgendaRow key={item.key} first={i === 0} onPress={item.kind === 'event' ? () => setSheet({ open: true, event: item.event }) : undefined}>
                      {item.kind === 'event' ? (
                        <>
                          <View style={{ width: 54 }}>
                            <Text variant="small" weight="semibold" color="accent">
                              {item.event.all_day ? t('calendar.allDayShort') : fmtTime(item.event.starts_at)}
                            </Text>
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text variant="bodyStrong">{item.event.title}</Text>
                            {item.event.location ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <MapPin size={12} color={colors.textMuted} />
                                <Text variant="small" color="textMuted">
                                  {item.event.location}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </>
                      ) : item.kind === 'birthday' ? (
                        <>
                          <Cake size={20} color={colors.accent} />
                          <Text style={{ flex: 1 }} variant="bodyStrong">
                            {t('calendar.birthdayOf', { name: item.name })}
                          </Text>
                          <Avatar name={item.name} colorIndex={item.colorIndex} size={26} />
                        </>
                      ) : item.kind === 'dinner' ? (
                        <>
                          <UtensilsCrossed size={18} color={colors.honey} />
                          <Text style={{ flex: 1 }} color="textSoft">
                            {t('calendar.dinner', { title: item.title })}
                          </Text>
                        </>
                      ) : (
                        <>
                          <CircleCheck size={18} color={colors.textMuted} />
                          <Text style={{ flex: 1 }} color="textSoft">
                            {item.title}
                          </Text>
                          {item.who ? <Avatar name={item.who.name} colorIndex={item.who.colorIndex} size={22} /> : null}
                        </>
                      )}
                    </AgendaRow>
                  ))}
                </Card>
              )}
            </View>
          );
        })}

        {events.length === 0 && byDay.size <= 1 ? (
          <EmptyState Icon={CalendarDays} title={t('calendar.emptyTitle')} body={t('calendar.emptyBody')} />
        ) : null}
      </Screen>

      <Fab accessibilityLabel={t('calendar.newEvent')} onPress={() => setSheet({ open: true, event: null })} />

      <EventSheet visible={sheet.open} event={sheet.event} onClose={() => setSheet({ open: false, event: null })} />
    </View>
  );
}

function AgendaRow({ first, onPress, children }: { first: boolean; onPress?: () => void; children: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: 52,
        paddingHorizontal: space.lg,
        paddingVertical: space.sm,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.hairline,
        backgroundColor: pressed ? colors.raised : 'transparent',
      })}
    >
      {children}
    </Pressable>
  );
}
