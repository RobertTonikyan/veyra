// Birthdays are day + month only (no year → we never know anyone's age).
// 29 Feb is celebrated on 28 Feb in non-leap years — same rule as the server.

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export function daysInMonth(month: number): number {
  if (month === 2) return 29;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** The date this birthday falls on in a given year. */
function occurrence(month: number, day: number, year: number): Date {
  const d = month === 2 && day === 29 && !isLeap(year) ? 28 : day;
  return new Date(year, month - 1, d);
}

/** Days until the next birthday (0 = today). */
export function daysUntilBirthday(month: number | null, day: number | null, from = new Date()): number | null {
  if (!month || !day) return null;
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = occurrence(month, day, today.getFullYear());
  if (next < today) next = occurrence(month, day, today.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

/** "12 במרץ" / "12 March" / "12 марта" */
export function birthdayLabel(month: number, day: number, language: string): string {
  try {
    return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long' }).format(new Date(2000, month - 1, day));
  } catch {
    return `${day}/${month}`;
  }
}

/** Short month names for the picker, in the app language. */
export function monthNames(language: string): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    try {
      return new Intl.DateTimeFormat(language, { month: 'short' }).format(new Date(2000, i, 1));
    } catch {
      return String(i + 1);
    }
  });
}
