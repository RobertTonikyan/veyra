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
  // everything on the money screen lives under one prefix, refreshed on any expense/settlement change
  money: (hid: string) => ['household', hid, 'money'] as const,
  expenses: (hid: string, month: string) => ['household', hid, 'money', 'expenses', month] as const,
  monthSpend: (hid: string, month: string) => ['household', hid, 'money', 'month-spend', month] as const,
  balances: (hid: string) => ['household', hid, 'money', 'balances'] as const,
  settleUp: (hid: string) => ['household', hid, 'money', 'settle-up'] as const,
  activity: (hid: string) => ['household', hid, 'activity', 'feed'] as const,
  kudosGiven: (hid: string) => ['household', hid, 'kudos', 'mine'] as const,
  recipes: (hid: string, language: string) => ['household', hid, 'recipes', language] as const,
  mealPlan: (hid: string, from: string) => ['household', hid, 'meal_plan', from] as const,
  events: (hid: string, from: string) => ['household', hid, 'events', from] as const,
  notes: (hid: string) => ['household', hid, 'notes'] as const,
  goals: (hid: string) => ['household', hid, 'goals'] as const,
  dateIdeas: (hid: string, language: string) => ['household', hid, 'date_ideas', language] as const,
  ideaMarks: (hid: string) => ['household', hid, 'date_ideas', 'marks'] as const,
};
