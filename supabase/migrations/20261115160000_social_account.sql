-- =====================================================================
-- Veyra · 0005 · Date ideas, notes, goals, activity feed, account lifecycle
-- =====================================================================
-- Account lifecycle (store requirement: in-app deletion):
--   pause_account()             → status 'paused'  (reversible: resume_account)
--   request_account_deletion()  → 'pending_deletion', deleted after 30 days
--                                 (cancel_account_deletion() until then)
--   request_account_deletion(true) → deleted right now
--   purge_deleted_accounts()    → daily pg_cron job
-- Leaving a house:
--   leave_household() refuses while your balance there isn't zero.
--   If the owner leaves/deletes → the longest-standing member becomes owner.
--   If the last member leaves   → the house and all its data are deleted.
-- =====================================================================

-- ---------- date ideas -----------------------------------------------

create table public.date_ideas (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid references public.households (id) on delete cascade, -- null = built-in
  locale        text check (locale in ('he', 'en', 'ru')),
  title         text not null check (char_length(trim(title)) between 1 and 80),
  description   text check (char_length(description) <= 500),
  category      text not null default 'home' check (category in ('home', 'out', 'active', 'trip')),
  cost_level    smallint not null default 1 check (cost_level between 0 and 3),
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  check ((household_id is null) = (locale is not null))
);

create index date_ideas_builtin_idx on public.date_ideas (locale) where household_id is null;
create index date_ideas_household_idx on public.date_ideas (household_id);

-- per-house state for any idea (built-in or own): saved / done
create table public.date_idea_marks (
  household_id  uuid not null references public.households (id) on delete cascade,
  idea_id       uuid not null references public.date_ideas (id) on delete cascade,
  saved         boolean not null default true,
  done_on       date,
  rating        smallint check (rating between 1 and 5),
  updated_at    timestamptz not null default now(),
  primary key (household_id, idea_id)
);

alter table public.date_ideas      enable row level security;
alter table public.date_idea_marks enable row level security;

create policy "date_ideas_select" on public.date_ideas
  for select to authenticated using (household_id is null or public.is_member(household_id));
create policy "date_ideas_insert" on public.date_ideas
  for insert to authenticated
  with check (household_id is not null and public.is_member(household_id)
              and created_by = (select auth.uid()));
create policy "date_ideas_update" on public.date_ideas
  for update to authenticated
  using (household_id is not null and public.is_member(household_id))
  with check (household_id is not null and public.is_member(household_id));
create policy "date_ideas_delete" on public.date_ideas
  for delete to authenticated using (household_id is not null and public.is_member(household_id));

create policy "date_marks_all" on public.date_idea_marks
  for all to authenticated
  using (public.is_member(household_id))
  with check (
    public.is_member(household_id)
    and exists (select 1 from public.date_ideas d
                where d.id = idea_id
                  and (d.household_id is null or d.household_id = date_idea_marks.household_id))
  );

revoke insert, update on public.date_ideas from anon, authenticated;
grant insert (household_id, title, description, category, cost_level) on public.date_ideas to authenticated;
grant update (title, description, category, cost_level) on public.date_ideas to authenticated;
revoke all on public.date_idea_marks from anon;

create trigger date_idea_marks_updated_at
  before update on public.date_idea_marks
  for each row execute function public.set_updated_at();

-- ---------- notes ----------------------------------------------------

create table public.notes (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  body          text not null check (char_length(trim(body)) between 1 and 2000),
  pinned        boolean not null default false,
  color_index   smallint not null default 0 check (color_index between 0 and 7),
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index notes_household_idx on public.notes (household_id, pinned desc, updated_at desc);

create trigger notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

alter table public.notes enable row level security;

create policy "notes_select" on public.notes
  for select to authenticated using (public.is_member(household_id));
create policy "notes_insert" on public.notes
  for insert to authenticated
  with check (public.is_member(household_id) and created_by = (select auth.uid()));
create policy "notes_update" on public.notes
  for update to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "notes_delete" on public.notes
  for delete to authenticated using (public.is_member(household_id));

revoke insert, update on public.notes from anon, authenticated;
grant insert (household_id, body, pinned, color_index) on public.notes to authenticated;
grant update (body, pinned, color_index) on public.notes to authenticated;

-- ---------- goals (shared, optional money target) --------------------

create table public.goals (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households (id) on delete cascade,
  title          text not null check (char_length(trim(title)) between 1 and 60),
  emoji          text check (char_length(emoji) <= 8),
  target_agorot  integer check (target_agorot > 0),
  saved_agorot   integer not null default 0,           -- maintained by trigger
  due_date       date,
  done_at        timestamptz,
  created_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now()
);

create table public.goal_contributions (
  id             uuid primary key default gen_random_uuid(),
  goal_id        uuid not null references public.goals (id) on delete cascade,
  household_id   uuid not null references public.households (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  amount_agorot  integer not null check (amount_agorot <> 0),   -- negative = withdrawal
  created_at     timestamptz not null default now()
);

create index goal_contributions_goal_idx on public.goal_contributions (goal_id);

alter table public.goals              enable row level security;
alter table public.goal_contributions enable row level security;

create policy "goals_select" on public.goals
  for select to authenticated using (public.is_member(household_id));
create policy "goals_insert" on public.goals
  for insert to authenticated
  with check (public.is_member(household_id) and created_by = (select auth.uid()));
create policy "goals_update" on public.goals
  for update to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "goals_delete" on public.goals
  for delete to authenticated using (public.is_member(household_id));

create policy "goal_contrib_select" on public.goal_contributions
  for select to authenticated using (public.is_member(household_id));
create policy "goal_contrib_insert" on public.goal_contributions
  for insert to authenticated
  with check (
    user_id = (select auth.uid()) and public.is_member(household_id)
    and exists (select 1 from public.goals g
                where g.id = goal_id and g.household_id = goal_contributions.household_id)
  );
create policy "goal_contrib_delete_own" on public.goal_contributions
  for delete to authenticated using (user_id = (select auth.uid()));

revoke insert, update on public.goals from anon, authenticated;
grant insert (household_id, title, emoji, target_agorot, due_date) on public.goals to authenticated;
grant update (title, emoji, target_agorot, due_date, done_at) on public.goals to authenticated;
revoke insert, update on public.goal_contributions from anon, authenticated;
grant insert (goal_id, household_id, amount_agorot) on public.goal_contributions to authenticated;

create or replace function public.sync_goal_saved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid := coalesce(new.goal_id, old.goal_id);
begin
  update public.goals g
  set saved_agorot = coalesce((select sum(c.amount_agorot)
                               from public.goal_contributions c where c.goal_id = gid), 0)
  where g.id = gid;
  return null;
end;
$$;

create trigger goal_contributions_sync
  after insert or delete on public.goal_contributions
  for each row execute function public.sync_goal_saved();

-- ---------- activity feed (written only by triggers) -----------------

create table public.activity (
  id            bigint generated always as identity primary key,
  household_id  uuid not null references public.households (id) on delete cascade,
  actor         uuid references public.profiles (id) on delete set null,
  kind          text not null,       -- shopping_added | chore_done | expense_added | settled | member_joined | kudos
  ref_id        uuid,
  payload       jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create index activity_household_time_idx on public.activity (household_id, created_at desc);

alter table public.activity enable row level security;

create policy "activity_select" on public.activity
  for select to authenticated using (public.is_member(household_id));

revoke insert, update, delete on public.activity from anon, authenticated;

create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'shopping_items' then
    insert into public.activity (household_id, actor, kind, ref_id, payload)
    values (new.household_id, new.added_by, 'shopping_added', new.id,
            jsonb_build_object('name', new.name));
  elsif tg_table_name = 'chore_logs' then
    insert into public.activity (household_id, actor, kind, ref_id, payload)
    values (new.household_id, new.user_id, 'chore_done', new.id,
            jsonb_build_object('title', new.title, 'points', new.points, 'rescue', new.rescue));
  elsif tg_table_name = 'expenses' then
    insert into public.activity (household_id, actor, kind, ref_id, payload)
    values (new.household_id, new.paid_by, 'expense_added', new.id,
            jsonb_build_object('title', new.title, 'amount_agorot', new.amount_agorot));
  elsif tg_table_name = 'settlements' then
    insert into public.activity (household_id, actor, kind, ref_id, payload)
    values (new.household_id, new.from_user, 'settled', new.id,
            jsonb_build_object('to', new.to_user, 'amount_agorot', new.amount_agorot));
  elsif tg_table_name = 'household_members' then
    insert into public.activity (household_id, actor, kind, ref_id, payload)
    values (new.household_id, new.user_id, 'member_joined', null, '{}');
  elsif tg_table_name = 'kudos' then
    insert into public.activity (household_id, actor, kind, ref_id, payload)
    values (new.household_id, new.from_user, 'kudos', new.log_id,
            jsonb_build_object('to', new.to_user));
  end if;
  return null;
end;
$$;

create trigger activity_shopping    after insert on public.shopping_items    for each row execute function public.log_activity();
create trigger activity_chore_logs  after insert on public.chore_logs        for each row execute function public.log_activity();
create trigger activity_expenses    after insert on public.expenses          for each row execute function public.log_activity();
create trigger activity_settlements after insert on public.settlements       for each row execute function public.log_activity();
create trigger activity_members     after insert on public.household_members for each row execute function public.log_activity();
create trigger activity_kudos       after insert on public.kudos             for each row execute function public.log_activity();

-- ---------- membership changes: owner hand-off + empty house cleanup -

create or replace function public.after_member_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- house already being deleted (cascade) → nothing to do
  if not exists (select 1 from public.households where id = old.household_id) then
    return null;
  end if;

  if not exists (select 1 from public.household_members where household_id = old.household_id) then
    delete from public.households where id = old.household_id;
  elsif old.role = 'owner'
        and not exists (select 1 from public.household_members
                        where household_id = old.household_id and role = 'owner') then
    update public.household_members set role = 'owner'
    where (household_id, user_id) = (
      select household_id, user_id from public.household_members
      where household_id = old.household_id
      order by joined_at, user_id limit 1
    );
  end if;
  return null;
end;
$$;

create trigger household_members_removed
  after delete on public.household_members
  for each row execute function public.after_member_removed();

-- leaving goes through leave_household() (balance check); owners can still remove others
drop policy "members_delete" on public.household_members;
create policy "members_delete_by_owner" on public.household_members
  for delete to authenticated
  using (public.is_owner(household_id) and user_id <> (select auth.uid()));

create or replace function public.leave_household(p_household uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  bal bigint;
begin
  if not public.is_member(p_household) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  select b.balance_agorot into bal
  from public.balances b
  where b.household_id = p_household and b.user_id = uid;

  if coalesce(bal, 0) <> 0 then
    raise exception 'balance_not_zero' using errcode = 'P0001', detail = bal::text;
  end if;

  delete from public.household_members where household_id = p_household and user_id = uid;
end;
$$;

-- ---------- account lifecycle ----------------------------------------

create or replace function public.pause_account()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set status = 'paused', delete_after = null
  where id = auth.uid();
$$;

create or replace function public.resume_account()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set status = 'active', delete_after = null
  where id = auth.uid();
$$;

create or replace function public.request_account_deletion(p_immediate boolean default false)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid  uuid := auth.uid();
  when_ timestamptz;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_immediate then
    delete from auth.users where id = uid;   -- cascades to profile + memberships
    return now();
  end if;

  when_ := now() + interval '30 days';
  update public.profiles set status = 'pending_deletion', delete_after = when_ where id = uid;
  return when_;
end;
$$;

create or replace function public.cancel_account_deletion()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set status = 'active', delete_after = null
  where id = auth.uid() and status = 'pending_deletion';
$$;

-- run daily by pg_cron (no client access)
create or replace function public.purge_deleted_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  with gone as (
    delete from auth.users u
    using public.profiles p
    where p.id = u.id and p.status = 'pending_deletion' and p.delete_after <= now()
    returning 1
  )
  select count(*) into n from gone;
  return n;
end;
$$;

-- ---------- grants ---------------------------------------------------

revoke all on function public.sync_goal_saved()                     from public, anon, authenticated;
revoke all on function public.log_activity()                        from public, anon, authenticated;
revoke all on function public.after_member_removed()                from public, anon, authenticated;
revoke all on function public.purge_deleted_accounts()              from public, anon, authenticated;
revoke all on function public.leave_household(uuid)                 from public, anon;
revoke all on function public.pause_account()                       from public, anon;
revoke all on function public.resume_account()                      from public, anon;
revoke all on function public.request_account_deletion(boolean)     from public, anon;
revoke all on function public.cancel_account_deletion()             from public, anon;
grant execute on function public.leave_household(uuid)              to authenticated;
grant execute on function public.pause_account()                    to authenticated;
grant execute on function public.resume_account()                   to authenticated;
grant execute on function public.request_account_deletion(boolean)  to authenticated;
grant execute on function public.cancel_account_deletion()          to authenticated;

-- ---------- realtime + daily purge -----------------------------------

alter publication supabase_realtime
  add table public.notes, public.goals, public.activity;

create extension if not exists pg_cron;

select cron.schedule(
  'veyra-purge-deleted-accounts',
  '15 3 * * *',                          -- 03:15 UTC every day
  $$ select public.purge_deleted_accounts(); $$
);
