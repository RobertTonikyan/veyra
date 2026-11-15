// Every key starts with ['household', id, table] so that a realtime change
// on a table can invalidate everything built from it in one call.

export const qk = {
  table: (hid: string, table: string) => ['household', hid, table] as const,
  members: (hid: string) => ['household', hid, 'household_members'] as const,
  shopping: (hid: string) => ['household', hid, 'shopping_items'] as const,
  shoppingSuggestions: (hid: string) => ['household', hid, 'activity', 'shopping-suggestions'] as const,
};
