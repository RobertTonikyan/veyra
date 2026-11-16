import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { useEvents } from '@/features/calendar/api';
import { useChores } from '@/features/chores/api';
import { useHousehold } from '@/household/HouseholdProvider';
import { useMembers } from '@/household/useMembers';
import { useI18n } from '@/i18n';

import { dayKey, planNotifications, planSignature } from './plan';
import { setPermissionState, useNotificationPrefs, type PermissionState } from './prefs';

const CHANNEL = 'reminders';

// Show reminders even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function toState(p: Notifications.NotificationPermissionsStatus): PermissionState {
  if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return p.status === 'undetermined' ? 'undetermined' : 'denied';
}

/** Asks for permission (only if never asked) and reports the result. */
export async function ensureNotificationPermission(ask = true): Promise<PermissionState> {
  let p = await Notifications.getPermissionsAsync();
  if (ask && p.status === 'undetermined' && p.canAskAgain) {
    p = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
  }
  const s = toState(p);
  setPermissionState(s);
  return s;
}

/**
 * Keeps this phone's scheduled reminders in sync with the household:
 * morning summary, evening chore nudge, birthdays (+3-day heads-up) and calendar events.
 * Renders nothing. Mounted once, inside the signed-in app.
 */
export function NotificationScheduler() {
  const router = useRouter();
  const { t, language } = useI18n();
  const { session } = useAuth();
  const { profile, household } = useHousehold();
  const { prefs, loaded, permission } = useNotificationPrefs();
  const me = session?.user.id ?? '';

  // "now" moves forward whenever the app comes back to the foreground
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        setNow(new Date());
        void ensureNotificationPermission(false);
      }
    });
    return () => sub.remove();
  }, []);

  const from = dayKey(now);
  const to = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15));
  const chores = useChores();
  const events = useEvents(from, to);
  const members = useMembers();

  // one-time setup: Android channel + permission
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync(CHANNEL, {
        name: t('notif.channel'),
        importance: Notifications.AndroidImportance.DEFAULT,
      }).catch(() => {});
    }
    ensureNotificationPermission(true).catch(() => setPermissionState('denied'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plan = useMemo(() => {
    if (!loaded || !chores.isSuccess || !events.isSuccess || !members.isSuccess || !profile || !household) return null;
    if (profile.status !== 'active') return []; // paused / leaving → silence
    const timeFmt = new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit', hour12: false });
    return planNotifications({
      now,
      me,
      morning: { on: profile.reminders_on !== false, time: profile.reminder_time ?? '08:30' },
      prefs,
      headsUp: household.birthday_heads_up ?? household.type === 'couple',
      chores: chores.data,
      events: events.data,
      members: members.data,
      t,
      formatTime: (d) => timeFmt.format(d),
    });
  }, [loaded, chores.isSuccess, chores.data, events.isSuccess, events.data, members.isSuccess, members.data, profile, household, now, me, prefs, t, language]);

  // reschedule only when the plan actually changed (debounced: realtime can send bursts)
  const lastSignature = useRef<string | null>(null);
  useEffect(() => {
    if (!plan || permission !== 'granted') return;
    const signature = planSignature(plan);
    if (signature === lastSignature.current) return;

    const timer = setTimeout(async () => {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        for (const p of plan) {
          await Notifications.scheduleNotificationAsync({
            identifier: p.id,
            content: { title: p.title, body: p.body, data: { url: p.url }, sound: true },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.date, channelId: CHANNEL },
          });
        }
        lastSignature.current = signature;
      } catch (e) {
        if (__DEV__) console.warn('[notifications] schedule failed', e);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [plan, permission]);

  // tapping a reminder opens the right screen
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
  }, [response, router]);

  return null;
}

/** A reminder in a few seconds, to check that notifications reach this phone. */
export async function sendTestNotification(title: string, body: string): Promise<PermissionState> {
  const state = await ensureNotificationPermission(true);
  if (state !== 'granted') return state;
  await Notifications.scheduleNotificationAsync({
    identifier: `test:${Date.now()}`,
    content: { title, body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL },
  });
  return state;
}

/** For the dev panel: what is waiting to fire on this phone. */
export async function listScheduled(): Promise<{ id: string; title: string; when: string }[]> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.map((n) => {
    const tr = n.trigger as { type?: string; value?: number; date?: number | string } | null;
    const ms = typeof tr?.value === 'number' ? tr.value : tr?.date != null ? new Date(tr.date).getTime() : NaN;
    return {
      id: n.identifier,
      title: n.content.title ?? '',
      when: Number.isNaN(ms) ? '?' : new Date(ms).toLocaleString(),
    };
  });
}
