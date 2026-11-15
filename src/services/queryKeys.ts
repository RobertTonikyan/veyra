// Every key starts with ['household', id, table] so that a realtime change
// on a table can invalidate everything built from it in one call.

export const qk = {
  table: (hid: string, table: string) => ['household', hid, table] as const,
  members: (hid: string) => ['household', hid, 'household_members'] as const,
  shopping: (hid: string) => ['household', hid, 'shopping_items'] as const,
  shoppingSuggestions: (hid: string) => ['household', hid, 'activity', 'shopping-suggestions'] as const,
  categoryMemory: (hid: string) => ['household', hid, 'shopping_category_memory'] as const,
  chores: (hid: string) => ['household', hid, 'chores'] as const,
  // under chore_logs so a realtime change to the logs refreshes every leaderboard
  scores: (hid: string, period: string) => ['household', hid, 'chore_logs', 'scores', period] as const,
};
