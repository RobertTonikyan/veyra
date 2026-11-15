-- =====================================================================
-- Veyra · 0002 · Shopping list + chores, scoring, kudos
-- =====================================================================
-- Scoring rules (from the spec):
--   * effort: 5 (quick) / 10 (normal) / 20 (big)
--   * rescue: doing someone else's overdue chore → +50%
--   * joint:  done together → points split evenly, rounded up
--   * turns:  rotate=true passes the chore to the next member after completion
--   * snooze: max 2 times per due date
--   * weekly goal: 100 points per member (app constant), week starts Sunday
-- =====================================================================

-- Households live in a timezone, so "today" and "this week" are local.
alter table public.households
  add column timezone text not null default 'Asia/Jerusalem';

grant update (timezone) on public.households to authenticated;

create or replace function public.household_today(hid uuid)
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone h.timezone)::date
  from public.households h where h.id = hid;
$$;

-- ---------- shopping_items -------------------------------------------

create table public.shopping_items (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  name          text not null check (char_length(trim(name)) between 1 and 80),
  quantity      text check (char_length(quantity) <= 20),
  category      text check (char_length(category) <= 30),
  added_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  checked_at    timestamptz,
  checked_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index shopping_items_household_idx
  on public.shopping_items (household_id, checked_at, created_at);

alter table public.shopping_items enable row level security;

create policy "shopping_select" on public.shopping_items
  for select to authenticated using (public.is_member(household_id));
create policy "shopping_insert" on public.shopping_items
  for insert to authenticated
  with check (public.is_member(household_id) and added_by = (select auth.uid()));
create policy "shopping_update" on public.shopping_items
  for update to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "shopping_delete" on public.shopping_items
  for delete to authenticated using (public.is_member(household_id));

revoke insert, update on public.shopping_items from anon, authenticated;
grant insert (household_id, name, quantity, category) on public.shopping_items to authenticated;
grant update (name, quantity, category, checked_at, checked_by) on public.shopping_items to authenticated;

-- ---------- chores ---------------------------------------------------

create table public.chores (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  title         text not null check (char_length(trim(title)) between 1 and 60),
  effort        smallint not null default 10 check (effort in (5, 10, 20)),
  recurrence    text not null default 'none'
                check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  due_date      date,
  assignee      uuid,                       -- null = anyone
  rotate        boolean not null default false,
  is_joint      boolean not null default false,
  snooze_count  smallint not null default 0 check (snooze_count between 0 and 2),
  archived_at   timestamptz,
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  -- assignee must be a member of THIS household; leaving clears it.
  foreign key (household_id, assignee)
    references public.household_members (household_id, user_id)
    on delete set null (assignee)
);

create index chores_household_idx on public.chores (household_id, archived_at, due_date);

alter table public.chores enable row level security;

create policy "chores_select" on public.chores
  for select to authenticated using (public.is_member(household_id));
create policy "chores_insert" on public.chores
  for insert to authenticated
  with check (public.is_member(household_id) and created_by = (select auth.uid()));
create policy "chores_update" on public.chores
  for update to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "chores_delete" on public.chores
  for delete to authenticated using (public.is_member(household_id));

revoke insert, update on public.chores from anon, authenticated;
grant insert (household_id, title, effort, recurrence, due_date, assignee, rotate, is_joint)
  on public.chores to authenticated;
grant update (title, effort, recurrence, due_date, assignee, rotate, is_joint, archived_at)
  on public.chores to authenticated;

-- ---------- chore_logs (written only by complete_chore) --------------

create table public.chore_logs (
  id            uuid primary key default gen_random_uuid(),
  chore_id      uuid references public.chores (id) on delete set null,
  household_id  uuid not null references public.households (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  title         text not null,              -- snapshot, survives chore deletion
  points        smallint not null check (points >= 0),
  rescue        boolean not null default false,
  joint         boolean not null default false,
  completed_at  timestamptz not null default now()
);

create index chore_logs_household_time_idx on public.chore_logs (household_id, completed_at desc);

alter table public.chore_logs enable row level security;

create policy "chore_logs_select" on public.chore_logs
  for select to authenticated using (public.is_member(household_id));

revoke insert, update, delete on public.chore_logs from anon, authenticated;

-- ---------- kudos ----------------------------------------------------

create table public.kudos (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  log_id        uuid not null references public.chore_logs (id) on delete cascade,
  from_user     uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  to_user       uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (log_id, from_user),
  check (from_user <> to_user)
);

alter table public.kudos enable row level security;

create policy "kudos_select" on public.kudos
  for select to authenticated using (public.is_member(household_id));
create policy "kudos_insert" on public.kudos
  for insert to authenticated
  with check (
    from_user = (select auth.uid())
    and public.is_member(household_id)
    and exists (
      select 1 from public.chore_logs l
      where l.id = log_id and l.user_id = to_user and l.household_id = kudos.household_id
    )
  );
create policy "kudos_delete_own" on public.kudos
  for delete to authenticated using (from_user = (select auth.uid()));

revoke insert, update on public.kudos from anon, authenticated;
grant insert (household_id, log_id, to_user) on public.kudos to authenticated;

-- ---------- complete_chore -------------------------------------------
-- Marks a chore done, writes score logs, then advances / archives it.
-- p_with: other members who did it together (joint). Returns caller's points.

create or replace function public.complete_chore(p_chore uuid, p_with uuid[] default '{}')
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid          uuid := auth.uid();
  c            public.chores%rowtype;
  today        date;
  participants uuid[];
  is_rescue    boolean;
  base_points  numeric;
  each_points  smallint;
  next_due     date;
  next_assignee uuid;
  cur_joined   timestamptz;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into c from public.chores where id = p_chore for update;
  if not found or not public.is_member(c.household_id) then
    raise exception 'chore_not_found' using errcode = 'P0001';
  end if;
  if c.archived_at is not null then
    raise exception 'chore_archived' using errcode = 'P0001';
  end if;

  today := public.household_today(c.household_id);

  -- caller + valid co-members, no duplicates
  select array_agg(distinct m.user_id) into participants
  from public.household_members m
  where m.household_id = c.household_id
    and (m.user_id = uid or m.user_id = any (coalesce(p_with, '{}')));

  is_rescue := c.assignee is not null and c.assignee <> uid
               and not (c.assignee = any (participants))
               and c.due_date is not null and c.due_date < today;

  base_points := c.effort * case when is_rescue then 1.5 else 1 end;
  each_points := ceil(base_points / cardinality(participants))::smallint;

  insert into public.chore_logs (chore_id, household_id, user_id, title, points, rescue, joint)
  select c.id, c.household_id, p, c.title, each_points, is_rescue, cardinality(participants) > 1
  from unnest(participants) as p;

  if c.recurrence = 'none' then
    update public.chores set archived_at = now() where id = c.id;
  else
    next_due := greatest(coalesce(c.due_date, today), today) + case c.recurrence
      when 'daily'   then interval '1 day'
      when 'weekly'  then interval '7 days'
      when 'monthly' then interval '1 month'
    end;

    next_assignee := c.assignee;
    if c.rotate then
      -- next member by join order after the current one, wrapping around
      select m.joined_at into cur_joined
      from public.household_members m
      where m.household_id = c.household_id and m.user_id = coalesce(c.assignee, uid);

      select m.user_id into next_assignee
      from public.household_members m
      where m.household_id = c.household_id
      order by (m.joined_at, m.user_id) <= (cur_joined, coalesce(c.assignee, uid)),
               m.joined_at, m.user_id
      limit 1;
    end if;

    update public.chores
    set due_date = next_due, snooze_count = 0, assignee = next_assignee
    where id = c.id;
  end if;

  return each_points;
end;
$$;

-- ---------- snooze_chore ---------------------------------------------

create or replace function public.snooze_chore(p_chore uuid)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chores%rowtype;
  new_due date;
begin
  select * into c from public.chores where id = p_chore for update;
  if not found or not public.is_member(c.household_id) then
    raise exception 'chore_not_found' using errcode = 'P0001';
  end if;
  if c.snooze_count >= 2 then
    raise exception 'snooze_limit' using errcode = 'P0001';
  end if;

  new_due := greatest(coalesce(c.due_date, public.household_today(c.household_id)),
                      public.household_today(c.household_id)) + 1;

  update public.chores
  set due_date = new_due, snooze_count = snooze_count + 1
  where id = c.id;

  return new_due;
end;
$$;

revoke all on function public.complete_chore(uuid, uuid[]) from public, anon;
revoke all on function public.snooze_chore(uuid)           from public, anon;
revoke all on function public.household_today(uuid)        from public, anon;
grant execute on function public.complete_chore(uuid, uuid[]) to authenticated;
grant execute on function public.snooze_chore(uuid)           to authenticated;
grant execute on function public.household_today(uuid)        to authenticated;

-- ---------- week_scores (Sunday-based, household local time) ---------
-- security_invoker → the caller's RLS on chore_logs applies.

create view public.week_scores
with (security_invoker = true)
as
select
  l.household_id,
  l.user_id,
  sum(l.points)::int  as points,
  count(*)::int       as chores_done,
  count(*) filter (where l.rescue)::int as rescues
from public.chore_logs l
join public.households h on h.id = l.household_id
where (l.completed_at at time zone h.timezone)::date >=
      (now() at time zone h.timezone)::date
        - extract(dow from (now() at time zone h.timezone))::int
group by l.household_id, l.user_id;

grant select on public.week_scores to authenticated;
revoke all on public.week_scores from anon;

-- ---------- realtime -------------------------------------------------

alter publication supabase_realtime
  add table public.shopping_items, public.chores, public.chore_logs, public.kudos;
