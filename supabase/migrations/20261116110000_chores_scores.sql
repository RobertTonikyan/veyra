-- =====================================================================
-- Veyra · 0007 · Chores: full points for joint work, scores by period, weekly reward
-- =====================================================================
-- * Joint chores: every participant gets the full points (as in the mockup:
--   "20 נק׳ לכל משתתף"), so doing things together is never a loss.
-- * household_scores(): leaderboard for 'week' (Sunday-based), 'month' or 'all',
--   in the household's own timezone. Runs as the caller → RLS applies.
-- * households.weekly_reward: optional shared prize for the team goal
--   ("ערב סרט עם פיצה").
-- =====================================================================

alter table public.households
  add column weekly_reward text check (char_length(weekly_reward) <= 60);

grant update (weekly_reward) on public.households to authenticated;

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
  pts          smallint;
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

  select array_agg(distinct m.user_id) into participants
  from public.household_members m
  where m.household_id = c.household_id
    and (m.user_id = uid or m.user_id = any (coalesce(p_with, '{}')));

  is_rescue := c.assignee is not null and c.assignee <> uid
               and not (c.assignee = any (participants))
               and c.due_date is not null and c.due_date < today;

  pts := ceil(c.effort * case when is_rescue then 1.5 else 1 end)::smallint;

  insert into public.chore_logs (chore_id, household_id, user_id, title, points, rescue, joint)
  select c.id, c.household_id, p, c.title, pts, is_rescue, cardinality(participants) > 1
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

  return pts;
end;
$$;

create or replace function public.household_scores(p_household uuid, p_period text default 'week')
returns table (user_id uuid, points integer, chores_done integer, rescues integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with h as (
    select (now() at time zone timezone)::date as today, timezone
    from public.households where id = p_household
  ), bounds as (
    select h.timezone,
           case p_period
             when 'week'  then h.today - extract(dow from h.today)::int
             when 'month' then date_trunc('month', h.today)::date
             else date '2000-01-01'
           end as since
    from h
  )
  select m.user_id,
         coalesce(sum(l.points), 0)::int,
         count(l.id)::int,
         count(l.id) filter (where l.rescue)::int
  from public.household_members m
  cross join bounds b
  left join public.chore_logs l
    on l.household_id = m.household_id
   and l.user_id = m.user_id
   and (l.completed_at at time zone b.timezone)::date >= b.since
  where m.household_id = p_household
  group by m.user_id
  order by 2 desc, 3 desc;
$$;

revoke all on function public.household_scores(uuid, text) from public, anon;
grant execute on function public.household_scores(uuid, text) to authenticated;
