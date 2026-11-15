-- =====================================================================
-- Veyra · 0003 · Money: expenses, shares, settlements, balances
-- =====================================================================
-- * All amounts are integer agorot (₪12.50 = 1250) → no float rounding.
-- * Each expense stores its per-person shares at creation time, so changing
--   the split mode later never rewrites history.
-- * split 'equal'   → amount / n, leftover agorot go to the first members.
--   split 'percent' → by household_members.share_percent, normalised over
--                     the participants (so "only the two of us" still works).
-- * balance > 0 → the house owes you; < 0 → you owe.
-- =====================================================================

-- ---------- expenses -------------------------------------------------

create table public.expenses (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households (id) on delete cascade,
  title          text not null check (char_length(trim(title)) between 1 and 60),
  amount_agorot  integer not null check (amount_agorot between 1 and 100000000),
  paid_by        uuid not null references public.profiles (id) on delete cascade,
  category       text check (char_length(category) <= 30),
  split_mode     text not null check (split_mode in ('equal', 'percent')),
  spent_on       date not null,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);

create index expenses_household_date_idx on public.expenses (household_id, spent_on desc);

create table public.expense_shares (
  expense_id    uuid not null references public.expenses (id) on delete cascade,
  household_id  uuid not null references public.households (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  share_agorot  integer not null check (share_agorot >= 0),
  primary key (expense_id, user_id)
);

create index expense_shares_household_idx on public.expense_shares (household_id, user_id);

alter table public.expenses       enable row level security;
alter table public.expense_shares enable row level security;

create policy "expenses_select" on public.expenses
  for select to authenticated using (public.is_member(household_id));
-- edit = delete + add again; only the creator (or payer) may delete.
create policy "expenses_delete" on public.expenses
  for delete to authenticated
  using (public.is_member(household_id)
         and (created_by = (select auth.uid()) or paid_by = (select auth.uid())));

create policy "expense_shares_select" on public.expense_shares
  for select to authenticated using (public.is_member(household_id));

revoke insert, update on public.expenses       from anon, authenticated;
revoke insert, update, delete on public.expense_shares from anon, authenticated;

-- ---------- add_expense ----------------------------------------------

create or replace function public.add_expense(
  p_household     uuid,
  p_title         text,
  p_amount_agorot integer,
  p_paid_by       uuid default null,     -- default: me
  p_category      text default null,
  p_spent_on      date default null,     -- default: household today
  p_participants  uuid[] default null    -- default: every member
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid        uuid := auth.uid();
  h          public.households%rowtype;
  eid        uuid;
  parts      uuid[];
  n          int;
  pct_total  numeric;
  allocated  integer;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_member(p_household) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  select * into h from public.households where id = p_household;

  -- payer must be a current member (history is kept if they leave later)
  if not exists (select 1 from public.household_members m
                 where m.household_id = p_household and m.user_id = coalesce(p_paid_by, uid)) then
    raise exception 'payer_not_member' using errcode = 'P0001';
  end if;

  -- participants: valid members only, stable order
  select array_agg(m.user_id order by m.joined_at, m.user_id) into parts
  from public.household_members m
  where m.household_id = p_household
    and (p_participants is null or m.user_id = any (p_participants));

  n := coalesce(cardinality(parts), 0);
  if n = 0 then
    raise exception 'no_participants' using errcode = 'P0001';
  end if;

  if h.split_mode = 'percent' then
    select sum(m.share_percent), count(*) filter (where m.share_percent is null)
      into pct_total, allocated
    from public.household_members m
    where m.household_id = p_household and m.user_id = any (parts);
    if allocated > 0 or pct_total is null or pct_total <= 0 then
      raise exception 'shares_not_set' using errcode = 'P0001';
    end if;
  end if;

  insert into public.expenses
    (household_id, title, amount_agorot, paid_by, category, split_mode, spent_on, created_by)
  values
    (p_household, trim(p_title), p_amount_agorot, coalesce(p_paid_by, uid), p_category,
     h.split_mode, coalesce(p_spent_on, public.household_today(p_household)), uid)
  returning id into eid;

  if h.split_mode = 'equal' then
    -- floor for everyone, then +1 agora to the first (amount % n) people
    insert into public.expense_shares (expense_id, household_id, user_id, share_agorot)
    select eid, p_household, u,
           p_amount_agorot / n + case when ord <= p_amount_agorot % n then 1 else 0 end
    from unnest(parts) with ordinality as t(u, ord);
  else
    insert into public.expense_shares (expense_id, household_id, user_id, share_agorot)
    select eid, p_household, m.user_id,
           floor(p_amount_agorot * m.share_percent / pct_total)::int
    from public.household_members m
    where m.household_id = p_household and m.user_id = any (parts);

    -- rounding leftover goes to the largest share holder
    select sum(share_agorot) into allocated from public.expense_shares where expense_id = eid;
    update public.expense_shares s
    set share_agorot = share_agorot + (p_amount_agorot - allocated)
    where s.expense_id = eid
      and s.user_id = (select user_id from public.expense_shares
                       where expense_id = eid
                       order by share_agorot desc, user_id limit 1);
  end if;

  return eid;
end;
$$;

-- ---------- settlements ----------------------------------------------

create table public.settlements (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households (id) on delete cascade,
  from_user      uuid not null references public.profiles (id) on delete cascade,
  to_user        uuid not null references public.profiles (id) on delete cascade,
  amount_agorot  integer not null check (amount_agorot > 0),
  created_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  check (from_user <> to_user)
);

create index settlements_household_idx on public.settlements (household_id, created_at desc);

alter table public.settlements enable row level security;

create policy "settlements_select" on public.settlements
  for select to authenticated using (public.is_member(household_id));
-- you can only record a payment you're part of, between two current members
create policy "settlements_insert" on public.settlements
  for insert to authenticated
  with check (
    public.is_member(household_id)
    and created_by = (select auth.uid())
    and (from_user = (select auth.uid()) or to_user = (select auth.uid()))
    and exists (select 1 from public.household_members m
                where m.household_id = settlements.household_id and m.user_id = from_user)
    and exists (select 1 from public.household_members m
                where m.household_id = settlements.household_id and m.user_id = to_user)
  );
create policy "settlements_delete_own" on public.settlements
  for delete to authenticated
  using (public.is_member(household_id) and created_by = (select auth.uid()));

revoke insert, update on public.settlements from anon, authenticated;
grant insert (household_id, from_user, to_user, amount_agorot) on public.settlements to authenticated;

-- ---------- balances -------------------------------------------------

create view public.balances
with (security_invoker = true)
as
select m.household_id, m.user_id,
  ( coalesce((select sum(e.amount_agorot) from public.expenses e
              where e.household_id = m.household_id and e.paid_by = m.user_id), 0)
  - coalesce((select sum(s.share_agorot) from public.expense_shares s
              where s.household_id = m.household_id and s.user_id = m.user_id), 0)
  + coalesce((select sum(t.amount_agorot) from public.settlements t
              where t.household_id = m.household_id and t.from_user = m.user_id), 0)
  - coalesce((select sum(t.amount_agorot) from public.settlements t
              where t.household_id = m.household_id and t.to_user = m.user_id), 0)
  )::bigint as balance_agorot
from public.household_members m;

grant select on public.balances to authenticated;
revoke all on public.balances from anon;

-- ---------- suggest_settlements (minimal transfers, greedy) ----------
-- Repeatedly: biggest debtor pays biggest creditor min(debt, credit).
-- Gives at most n-1 transfers.

create or replace function public.suggest_settlements(p_household uuid)
returns table (from_user uuid, to_user uuid, amount_agorot bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  ids  uuid[];
  bal  bigint[];
  d    int;
  c    int;
  amt  bigint;
  i    int;
begin
  if not public.is_member(p_household) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  select array_agg(b.user_id order by b.user_id), array_agg(b.balance_agorot order by b.user_id)
    into ids, bal
  from public.balances b
  where b.household_id = p_household and b.balance_agorot <> 0;

  if ids is null then
    return;
  end if;

  loop
    d := null; c := null;
    for i in 1..cardinality(bal) loop
      if bal[i] < 0 and (d is null or bal[i] < bal[d]) then d := i; end if;
      if bal[i] > 0 and (c is null or bal[i] > bal[c]) then c := i; end if;
    end loop;
    exit when d is null or c is null;

    amt := least(-bal[d], bal[c]);
    from_user := ids[d]; to_user := ids[c]; amount_agorot := amt;
    return next;
    bal[d] := bal[d] + amt;
    bal[c] := bal[c] - amt;
  end loop;
end;
$$;

-- ---------- month_spend ----------------------------------------------

create view public.month_spend
with (security_invoker = true)
as
select household_id,
       date_trunc('month', spent_on)::date as month,
       coalesce(category, '') as category,
       sum(amount_agorot)::bigint as total_agorot,
       count(*)::int as expenses
from public.expenses
group by 1, 2, 3;

grant select on public.month_spend to authenticated;
revoke all on public.month_spend from anon;

-- ---------- grants ---------------------------------------------------

revoke all on function public.add_expense(uuid, text, integer, uuid, text, date, uuid[]) from public, anon;
revoke all on function public.suggest_settlements(uuid) from public, anon;
grant execute on function public.add_expense(uuid, text, integer, uuid, text, date, uuid[]) to authenticated;
grant execute on function public.suggest_settlements(uuid) to authenticated;

alter publication supabase_realtime
  add table public.expenses, public.settlements;
