// Money is stored as integer agorot (₪12.50 = 1250) — no floating-point drift.

/** 386000 → "₪3,860" · 41280 → "₪412.80" */
export function formatMoney(agorot: number): string {
  const negative = agorot < 0;
  const abs = Math.abs(Math.round(agorot));
  const shekels = Math.floor(abs / 100);
  const rest = abs % 100;
  const whole = shekels.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const text = rest === 0 ? whole : `${whole}.${String(rest).padStart(2, '0')}`;
  return `${negative ? '-' : ''}₪${text}`;
}

/**
 * Parses what the user typed into agorot. Accepts "12", "12.5", "12,50", "₪1,200".
 * Returns null for anything that isn't a positive amount.
 */
export function parseMoney(input: string): number | null {
  let s = input.replace(/[₪\s]/g, '');
  // "1,200.50" → thousands comma; "12,50" → decimal comma
  if (/,\d{1,2}$/.test(s) && !s.includes('.')) s = s.replace(',', '.');
  s = s.replace(/,/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const agorot = Math.round(parseFloat(s) * 100);
  return agorot > 0 && agorot <= 100_000_000 ? agorot : null;
}

// ---- months as 'YYYY-MM' ----

export function monthOf(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  return monthOf(new Date(y, m - 1 + delta, 1));
}

/** First day and first day of the next month, as 'YYYY-MM-DD'. */
export function monthRange(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: `${shiftMonth(month, 1)}-01` };
}

/** "נובמבר 2026" in the app language. */
export function monthLabel(month: string, language: string): string {
  const [y, m] = month.split('-').map(Number);
  try {
    return new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
  } catch {
    return month;
  }
}

/** "היום" / "אתמול" / "12 בנובמבר" */
export function dayLabel(iso: string, language: string, t: (key: string) => string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (diff === 0) return t('money.today');
  if (diff === 1) return t('money.yesterday');
  try {
    return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long' }).format(date);
  } catch {
    return iso;
  }
}
