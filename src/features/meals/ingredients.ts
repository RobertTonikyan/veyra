import type { ShoppingUnit } from '@/features/shopping/units';

export type Ingredient = { name: string; qty?: string };

// Unit words in Hebrew, English and Russian → our unit codes.
const UNIT_WORDS: [ShoppingUnit, string[]][] = [
  ['kg', ['ק״ג', 'ק"ג', 'קג', 'קילו', 'kg', 'кг']],
  ['g', ['גרם', 'ג׳', "ג'", 'gr', 'g', 'гр', 'г']],
  ['ml', ['מ״ל', 'מ"ל', 'מל', 'ml', 'мл']],
  ['l', ['ליטר', 'ליטרים', 'l', 'liter', 'litre', 'л']],
  ['pack', ['אריזה', 'אריזות', 'חבילה', 'חבילות', 'pack', 'packs', 'pkg', 'уп', 'упаковка', 'упаковки']],
  ['unit', ['יח׳', "יח'", 'יחידות', 'יחידה', 'pcs', 'pc', 'шт']],
];

/**
 * "500 גרם" → { amount: 500, unit: 'g' } · "4" → { amount: 4, unit: 'unit' }
 * Anything we can't map ("2 כפות", "חופן") → null, and the text is kept as-is.
 */
export function parseQty(qty: string | undefined): { amount: number; unit: ShoppingUnit } | null {
  if (!qty) return null;
  const m = qty.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return null;
  const amount = parseFloat(m[1].replace(',', '.'));
  if (!(amount > 0)) return null;
  const word = m[2].trim().toLowerCase().replace(/\.$/, '');
  if (!word) return { amount, unit: 'unit' };
  for (const [unit, words] of UNIT_WORDS) {
    if (words.includes(word)) return { amount, unit };
  }
  return null;
}

/**
 * Editor text → ingredients. One per line; a leading amount becomes the qty:
 * "2 ביצים" → { name: "ביצים", qty: "2" } · "500 גרם פסטה" → { name: "פסטה", qty: "500 גרם" }
 * "פסטה - 500 גרם" also works.
 */
export function parseIngredientLines(text: string): Ingredient[] {
  const out: Ingredient[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim().replace(/^[-•*]\s*/, '');
    if (!line) continue;

    const dash = line.split(/\s[-–:]\s/);
    if (dash.length === 2) {
      out.push({ name: dash[0].trim().slice(0, 80), qty: dash[1].trim().slice(0, 20) });
      continue;
    }

    const m = line.match(/^(\d+(?:[.,]\d+)?)\s+(\S+)\s+(.+)$/);
    if (m && parseQty(`${m[1]} ${m[2]}`)) {
      out.push({ name: m[3].trim().slice(0, 80), qty: `${m[1]} ${m[2]}` });
      continue;
    }
    const n = line.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
    if (n) {
      out.push({ name: n[2].trim().slice(0, 80), qty: n[1] });
      continue;
    }
    out.push({ name: line.slice(0, 80) });
  }
  return out.slice(0, 60);
}

/** Ingredients → editor text (the inverse, for editing). */
export function ingredientsToText(list: Ingredient[]): string {
  return list.map((i) => (i.qty ? `${i.name} - ${i.qty}` : i.name)).join('\n');
}

export function asIngredients(json: unknown): Ingredient[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((x) => (x && typeof x === 'object' ? (x as Record<string, unknown>) : {}))
    .filter((x) => typeof x.name === 'string' && x.name.trim())
    .map((x) => ({ name: String(x.name), qty: typeof x.qty === 'string' && x.qty ? x.qty : undefined }));
}
