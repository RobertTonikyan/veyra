// Units are stored as codes ('kg', 'pack', …) and translated on screen, so a
// Hebrew speaker and a Russian speaker in the same house each see their own.

export type ShoppingUnit = 'unit' | 'kg' | 'g' | 'l' | 'ml' | 'pack';

export const UNITS: ShoppingUnit[] = ['unit', 'pack', 'kg', 'g', 'l', 'ml'];

/** Step for the − / + buttons, and the value a new unit starts at. */
export const UNIT_STEP: Record<ShoppingUnit, number> = {
  unit: 1,
  pack: 1,
  kg: 0.5,
  g: 100,
  l: 0.5,
  ml: 250,
};

export const UNIT_DEFAULT: Record<ShoppingUnit, number> = {
  unit: 1,
  pack: 1,
  kg: 1,
  g: 500,
  l: 1,
  ml: 500,
};

export function isUnit(value: string | null | undefined): value is ShoppingUnit {
  return !!value && (UNITS as string[]).includes(value);
}

/** 1.5 → "1.5", 2 → "2", 0.25 → "0.25" */
export function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 100) / 100);
}

/**
 * "2 kg" / "1.5 ק״ג" etc. `t` is the i18n function; returns null when there's nothing to show.
 * Falls back to the old free-text quantity for rows created before units existed.
 */
export function formatQuantity(
  t: (key: string, params?: Record<string, string | number>) => string,
  item: { amount: number | null; unit: string | null; quantity: string | null },
): string | null {
  if (item.amount != null) {
    const unit = isUnit(item.unit) ? item.unit : 'unit';
    return t(`shopping.unitsShort.${unit}`, { amount: formatAmount(item.amount) });
  }
  return item.quantity || null;
}
