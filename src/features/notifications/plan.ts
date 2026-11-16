// Pure planning: given the household data, which reminders should this phone show,
// and when? No React Native imports here, so it can be unit-tested with plain Node.

export type NotificationPrefs = {
  birthdays: boolean;
  chores: boolean;
  events: boolean;
};

export type PlanInput = {
  now: Date;
  me: string;
  morning: { on: boolean; time: string }; // "HH:MM"
  prefs: NotificationPrefs;
  /** house setting: remind 3 days before birthdays */
  headsUp: boolean;
  chores: { id: string; title: string; due_date: string | null; assignee: string | null }[];
  events: { id: string; title: string; starts_at: string; all_day: boolean; reminder_minutes: number | null }[];
  members: { user_id: string; display_name: string; birth_month: number | null; birth_day: number | null }[];
  t: (key: string, params?: Record<string, string | number>) => string;
  formatTime: (d: Date) => string;
};

export type Planned = {
  /** stable id: same reminder → same id, so we can tell if anything changed */
  id: string;
  date: Date;
  title: string;
  body: string;
  url: string;
};

/** iOS keeps at most 64 pending local notifications per app; stay well under. */
export const MAX_PENDING = 60;
const MORNING_DAYS = 7;
const BIRTHDAY_DAYS = 30;
const EVENT_DAYS = 14;
const EVENING_HOUR = 19;
const BIRTHDAY_HOUR = 9;
const DEFAULT_EVENT_LEAD_MIN = 30;

const pad = (n: number) => String(n).padStart(2, '0');
/** Local calendar day as "YYYY-MM-DD" (same format as chores.due_date). */
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function at(day: Date, hour: number, minute = 0): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
}

function addDays(day: Date, n: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + n);
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Next birthday on or after `from` (29 Feb → 28 Feb in non-leap years). */
function nextBirthday(month: number, day: number, from: Date): Date {
  const on = (y: number) => new Date(y, month - 1, month === 2 && day === 29 && !isLeap(y) ? 28 : day);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const thisYear = on(today.getFullYear());
  return thisYear >= today ? thisYear : on(today.getFullYear() + 1);
}

export function planNotifications(input: PlanInput): Planned[] {
  const { now, me, t } = input;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = dayKey(today);
  const out: Planned[] = [];
  const add = (p: Planned) => {
    if (p.date.getTime() > now.getTime() + 5_000) out.push(p);
  };

  // chores that are mine (or anyone's), grouped by the day they're due; overdue counts as today
  const myChores = input.chores.filter((c) => c.due_date && (c.assignee === null || c.assignee === me));
  const choresOn = (key: string) =>
    myChores.filter((c) => (key === todayKey ? c.due_date! <= todayKey : c.due_date === key));

  // events grouped by local day
  const eventsOn = (key: string) =>
    input.events
      .filter((e) => dayKey(new Date(e.starts_at)) === key)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  // ---- morning summary: only on days that have something ----
  if (input.morning.on) {
    const [hh, mm] = input.morning.time.split(':').map(Number);
    for (let i = 0; i < MORNING_DAYS; i++) {
      const day = addDays(today, i);
      const key = dayKey(day);
      const chores = choresOn(key);
      const events = eventsOn(key);
      if (chores.length === 0 && events.length === 0) continue;
      const parts: string[] = [];
      if (chores.length) parts.push(t('notif.choresToday', { count: chores.length, first: chores[0].title }));
      if (events.length) parts.push(t('notif.eventsToday', { count: events.length, first: events[0].title }));
      add({ id: `morning:${key}`, date: at(day, hh || 0, mm || 0), title: t('notif.morningTitle'), body: parts.join('\n'), url: '/' });
    }
  }

  // ---- evening nudge: a chore due that day is still open at 19:00 ----
  if (input.prefs.chores) {
    for (let i = 0; i < MORNING_DAYS; i++) {
      const day = addDays(today, i);
      const chores = choresOn(dayKey(day));
      if (!chores.length) continue;
      add({
        id: `evening:${dayKey(day)}`,
        date: at(day, EVENING_HOUR),
        title: t('notif.choreEveningTitle'),
        body: t('notif.choreEvening', { count: chores.length, first: chores[0].title, rest: chores.length - 1 }),
        url: '/chores',
      });
    }
  }

  // ---- birthdays (and the 3-day heads-up) ----
  if (input.prefs.birthdays) {
    for (const m of input.members) {
      if (!m.birth_month || !m.birth_day) continue;
      const bday = nextBirthday(m.birth_month, m.birth_day, today);
      const daysAway = Math.round((bday.getTime() - today.getTime()) / 86_400_000);
      if (daysAway > BIRTHDAY_DAYS) continue;
      const name = m.display_name || '?';

      if (m.user_id === me) {
        add({ id: `bday:${m.user_id}:${dayKey(bday)}`, date: at(bday, BIRTHDAY_HOUR), title: t('notif.myBirthdayTitle'), body: t('notif.myBirthdayBody'), url: '/' });
        continue;
      }
      add({ id: `bday:${m.user_id}:${dayKey(bday)}`, date: at(bday, BIRTHDAY_HOUR), title: t('notif.birthdayTitle', { name }), body: t('notif.birthdayBody'), url: '/' });
      if (input.headsUp) {
        add({ id: `headsup:${m.user_id}:${dayKey(bday)}`, date: at(addDays(bday, -3), BIRTHDAY_HOUR), title: t('notif.headsUpTitle', { name }), body: t('notif.headsUpBody'), url: '/' });
      }
    }
  }

  // ---- timed events: a while before they start ----
  if (input.prefs.events) {
    const until = addDays(today, EVENT_DAYS).getTime();
    for (const e of input.events) {
      if (e.all_day) continue; // all-day events are in the morning summary
      const start = new Date(e.starts_at);
      if (start.getTime() > until) continue;
      const lead = e.reminder_minutes ?? DEFAULT_EVENT_LEAD_MIN;
      add({
        id: `event:${e.id}:${e.starts_at}:${lead}`,
        date: new Date(start.getTime() - lead * 60_000),
        title: e.title,
        body: lead === 0 ? t('notif.eventNow') : t('notif.eventBody', { time: input.formatTime(start) }),
        url: '/calendar',
      });
    }
  }

  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_PENDING);
}

/** One string that changes whenever the planned reminders change. */
export function planSignature(plan: Planned[]): string {
  return plan.map((p) => `${p.id}|${p.date.getTime()}|${p.title}|${p.body}`).join('\n');
}
