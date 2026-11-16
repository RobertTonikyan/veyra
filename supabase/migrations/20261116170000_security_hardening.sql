-- Stage 5 · security hardening + missing foreign-key indexes.
-- Every table already has RLS with policies only for `authenticated`, so `anon` saw nothing.
-- This removes the grants as well, so a mistake in a future policy can't expose data to anon.

-- ---------- anon: no table access at all ----------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- ---------- functions: nothing executable by anon; new functions start closed ----------
revoke execute on all functions in schema public from anon, public;
alter default privileges in schema public revoke execute on functions from anon, public;
-- helpers used inside triggers / RPCs only
revoke execute on function public.enforce_member_cap() from authenticated;
revoke execute on function public.set_updated_at()     from authenticated;

-- ---------- foreign keys without an index (performance advisor) ----------
create index if not exists activity_actor_idx                on public.activity (actor);
create index if not exists chore_logs_chore_idx              on public.chore_logs (chore_id);
create index if not exists chore_logs_user_idx               on public.chore_logs (user_id);
create index if not exists chores_created_by_idx             on public.chores (created_by);
create index if not exists chores_assignee_idx               on public.chores (household_id, assignee);
create index if not exists date_idea_marks_idea_idx          on public.date_idea_marks (idea_id);
create index if not exists date_ideas_created_by_idx         on public.date_ideas (created_by);
create index if not exists events_created_by_idx             on public.events (created_by);
create index if not exists expense_shares_user_idx           on public.expense_shares (user_id);
create index if not exists expenses_created_by_idx           on public.expenses (created_by);
create index if not exists expenses_paid_by_idx              on public.expenses (paid_by);
create index if not exists goal_contributions_household_idx  on public.goal_contributions (household_id);
create index if not exists goal_contributions_user_idx       on public.goal_contributions (user_id);
create index if not exists goals_created_by_idx              on public.goals (created_by);
create index if not exists goals_household_idx               on public.goals (household_id);
create index if not exists households_created_by_idx         on public.households (created_by);
create index if not exists invites_created_by_idx            on public.invites (created_by);
create index if not exists kudos_from_user_idx               on public.kudos (from_user);
create index if not exists kudos_household_idx               on public.kudos (household_id);
create index if not exists kudos_to_user_idx                 on public.kudos (to_user);
create index if not exists meal_plan_created_by_idx          on public.meal_plan (created_by);
create index if not exists meal_plan_cook_idx                on public.meal_plan (household_id, cook);
create index if not exists meal_plan_recipe_idx              on public.meal_plan (recipe_id);
create index if not exists notes_created_by_idx              on public.notes (created_by);
create index if not exists receipt_items_expense_idx         on public.receipt_items (expense_id);
create index if not exists recipes_created_by_idx            on public.recipes (created_by);
create index if not exists settlements_created_by_idx        on public.settlements (created_by);
create index if not exists settlements_from_user_idx         on public.settlements (from_user);
create index if not exists settlements_to_user_idx           on public.settlements (to_user);
create index if not exists shopping_items_added_by_idx       on public.shopping_items (added_by);
create index if not exists shopping_items_checked_by_idx     on public.shopping_items (checked_by);
