// Dates are plain 'YYYY-MM-DD' strings (Postgres `date`), compared in local time.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

/** Whole days from today to `iso` (negative = in the past). */
export function daysFromToday(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

export type Section = 'overdue' | 'today' | 'soon' | 'anytime';

export function sectionOf(due: string | null): Section {
  if (!due) return 'anytime';
  const diff = daysFromToday(due);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  return 'soon';
}

/** "היום" / "מחר" / "מאתמול" / "בעוד 4 ימים" … via i18n keys under chores.due. */
export function dueLabel(t: (key: string, params?: Record<string, string | number>) => string, due: string | null) {
  if (!due) return t('chores.due.anytime');
  const diff = daysFromToday(due);
  if (diff === 0) return t('chores.due.today');
  if (diff === 1) return t('chores.due.tomorrow');
  if (diff === -1) return t('chores.due.yesterday');
  if (diff < -1) return t('chores.due.daysLate', { count: -diff });
  return t('chores.due.inDays', { count: diff });
}
