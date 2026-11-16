-- =====================================================================
-- Veyra · 0009 · Birthdays (day + month only) and house settings
-- =====================================================================
-- * profiles.birth_month / birth_day — optional, no year (we never store age).
--   29 Feb is celebrated on 28 Feb in non-leap years.
-- * households.birthday_heads_up — reminder a few days before.
--   null = automatic: on for couples, off for roommates/families.
-- * Daily job writes a 'birthday' line to the activity feed of every house.
-- * send_birthday_wish(): one wish per person per birthday, shown in the feed.
-- =====================================================================

alter table public.profiles
  add column birth_month smallint check (birth_month between 1 and 12),
  add column birth_day   smallint check (birth_day between 1 and 31),
  add constraint birthday_complete check ((birth_month is null) = (birth_day is null)),
  add constraint birthday_valid check (
    birth_month is null
    or birth_day <= case
         when birth_month = 2 then 29
         when birth_month in (4, 6, 9, 11) then 30
         else 31
       end
  );

grant update (birth_month, birth_day) on public.profiles to authenticated;

alter table public.households
  add column birthday_heads_up boolean;

grant update (birthday_heads_up) on public.households to authenticated;

-- Is (month, day) a birthday on the given date? Handles 29 Feb.
create or replace function public.is_birthday_on(m smallint, d smallint, on_date date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select m is not null and (
    (m = extract(month from on_date) and d = extract(day from on_date))
    or (
      m = 2 and d = 29
      and extract(month from on_date) = 2 and extract(day from on_date) = 28
      and not (
        (extract(year from on_date)::int % 4 = 0 and extract(year from on_date)::int % 100 <> 0)
        or extract(year from on_date)::int % 400 = 0
      )
    )
  );
$$;

-- Daily: one 'birthday' feed line per member whose birthday is today (house local time).
create or replace function public.log_birthdays()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  with today as (
    select h.id as household_id, (now() at time zone h.timezone)::date as local_day
    from public.households h
  ), due as (
    select t.household_id, m.user_id
    from today t
    join public.household_members m on m.household_id = t.household_id
    join public.profiles p on p.id = m.user_id
    where p.status = 'active'
      and public.is_birthday_on(p.birth_month, p.birth_day, t.local_day)
      and not exists (
        select 1 from public.activity a
        where a.household_id = t.household_id
          and a.actor = m.user_id
          and a.kind = 'birthday'
          and a.created_at > now() - interval '20 hours'
      )
  ), ins as (
    insert into public.activity (household_id, actor, kind, payload)
    select household_id, user_id, 'birthday', '{}'::jsonb from due
    returning 1
  )
  select count(*) into n from ins;
  return n;
end;
$$;

create or replace function public.send_birthday_wish(p_household uuid, p_to uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  p public.profiles%rowtype;
begin
  if uid is null or uid = p_to then
    raise exception 'invalid_wish' using errcode = 'P0001';
  end if;
  if not public.is_member(p_household)
     or not exists (select 1 from public.household_members
                    where household_id = p_household and user_id = p_to) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  select * into p from public.profiles where id = p_to;
  if not public.is_birthday_on(p.birth_month, p.birth_day, public.household_today(p_household)) then
    raise exception 'not_birthday' using errcode = 'P0001';
  end if;

  -- one wish per person per birthday
  if exists (select 1 from public.activity
             where household_id = p_household and actor = uid and kind = 'birthday_wish'
               and payload ->> 'to' = p_to::text and created_at > now() - interval '2 days') then
    return;
  end if;

  insert into public.activity (household_id, actor, kind, payload)
  values (p_household, uid, 'birthday_wish', jsonb_build_object('to', p_to));
end;
$$;

revoke all on function public.log_birthdays() from public, anon, authenticated;
revoke all on function public.send_birthday_wish(uuid, uuid) from public, anon;
grant execute on function public.send_birthday_wish(uuid, uuid) to authenticated;

-- 03:30 UTC ≈ 05:30–06:30 in Israel: the line is ready before anyone wakes up.
select cron.schedule(
  'veyra-log-birthdays',
  '30 3 * * *',
  $$ select public.log_birthdays(); $$
);
