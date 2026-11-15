-- =====================================================================
-- Veyra · 0001 · Core: profiles, households, members, invites
-- =====================================================================
-- Security model:
--   * Every table has RLS on.
--   * Access to household data goes through public.is_member(household_id).
--   * Creating a household / joining via invite happens ONLY through
--     SECURITY DEFINER RPCs, so clients can't insert themselves anywhere.
-- =====================================================================

-- ---------- helpers --------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- profiles -------------------------------------------------

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  display_name   text not null default '' check (char_length(display_name) <= 40),
  language       text not null default 'he' check (language in ('he', 'en', 'ru')),
  reminder_time  time not null default '08:30',
  reminders_on   boolean not null default true,
  status         text not null default 'active'
                 check (status in ('active', 'paused', 'pending_deletion')),
  delete_after   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint delete_after_matches_status
    check ((status = 'pending_deletion') = (delete_after is not null))
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ), 40)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- households -----------------------------------------------

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 40),
  type        text not null check (type in ('couple', 'roommates', 'family')),
  split_mode  text not null default 'equal' check (split_mode in ('equal', 'percent')),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger households_updated_at
  before update on public.households
  for each row execute function public.set_updated_at();

-- ---------- household_members ----------------------------------------

create table public.household_members (
  household_id   uuid not null references public.households (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  role           text not null default 'member' check (role in ('owner', 'member')),
  color_index    smallint not null default 0 check (color_index between 0 and 7),
  share_percent  numeric(5, 2) check (share_percent between 0 and 100),
  joined_at      timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_idx on public.household_members (user_id);

-- Hard cap: 20 members per household.
create or replace function public.enforce_member_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.household_members m
      where m.household_id = new.household_id) >= 20 then
    raise exception 'household_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger household_members_cap
  before insert on public.household_members
  for each row execute function public.enforce_member_cap();

-- ---------- invites --------------------------------------------------

create table public.invites (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  code          text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_by    uuid references public.profiles (id) on delete set null,
  max_uses      smallint not null default 1 check (max_uses between 1 and 19),
  uses          smallint not null default 0,
  expires_at    timestamptz not null default now() + interval '7 days',
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index invites_household_idx on public.invites (household_id);

-- ---------- membership checks (used by every RLS policy) -------------

create or replace function public.is_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_owner(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;

create or replace function public.shares_household(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members a
    join public.household_members b on b.household_id = a.household_id
    where a.user_id = (select auth.uid()) and b.user_id = other
  );
$$;

-- ---------- RPCs -----------------------------------------------------

-- Create a household and become its owner.
create or replace function public.create_household(p_name text, p_type text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.households (name, type, created_by)
  values (trim(p_name), p_type, uid)
  returning id into hid;

  insert into public.household_members (household_id, user_id, role, color_index)
  values (hid, uid, 'owner', 0);

  return hid;
end;
$$;

-- Generate an invite code (members only). Alphabet has no 0/O/1/I.
create or replace function public.create_invite(p_household uuid, p_max_uses smallint default 1)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 chars, 256 % 32 = 0 → no bias
  new_code text;
  i int;
begin
  if not public.is_member(p_household) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(
        alphabet,
        1 + (get_byte(extensions.gen_random_bytes(1), 0) % 32),
        1
      );
    end loop;
    exit when not exists (select 1 from public.invites where code = new_code);
  end loop;

  insert into public.invites (household_id, code, created_by, max_uses)
  values (p_household, new_code, auth.uid(), coalesce(p_max_uses, 1));

  return new_code;
end;
$$;

-- Join a household with a code. Returns the household id.
create or replace function public.redeem_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  inv public.invites%rowtype;
  next_color smallint;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into inv
  from public.invites
  where code = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'invalid_invite' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.household_members
             where household_id = inv.household_id and user_id = uid) then
    return inv.household_id; -- already a member: idempotent
  end if;

  if inv.revoked_at is not null or inv.expires_at < now() or inv.uses >= inv.max_uses then
    raise exception 'invalid_invite' using errcode = 'P0001';
  end if;

  select (count(*) % 8)::smallint into next_color
  from public.household_members where household_id = inv.household_id;

  insert into public.household_members (household_id, user_id, role, color_index)
  values (inv.household_id, uid, 'member', next_color);

  update public.invites set uses = uses + 1 where id = inv.id;

  return inv.household_id;
end;
$$;

-- Lock RPCs down: signed-in users only.
revoke all on function public.create_household(text, text)      from public, anon;
revoke all on function public.create_invite(uuid, smallint)     from public, anon;
revoke all on function public.redeem_invite(text)               from public, anon;
revoke all on function public.is_member(uuid)                   from public, anon;
revoke all on function public.is_owner(uuid)                    from public, anon;
revoke all on function public.shares_household(uuid)            from public, anon;
revoke all on function public.handle_new_user()                 from public, anon, authenticated;
grant execute on function public.create_household(text, text)  to authenticated;
grant execute on function public.create_invite(uuid, smallint) to authenticated;
grant execute on function public.redeem_invite(text)           to authenticated;
grant execute on function public.is_member(uuid)               to authenticated;
grant execute on function public.is_owner(uuid)                to authenticated;
grant execute on function public.shares_household(uuid)        to authenticated;

-- ---------- RLS ------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.invites           enable row level security;

-- profiles: see yourself + people you live with; edit only yourself.
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_household(id));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- households: members read; owner edits/deletes. Insert only via RPC.
create policy "households_select" on public.households
  for select to authenticated
  using (public.is_member(id));

create policy "households_update_owner" on public.households
  for update to authenticated
  using (public.is_owner(id))
  with check (public.is_owner(id));

create policy "households_delete_owner" on public.households
  for delete to authenticated
  using (public.is_owner(id));

-- members: read your household; leave yourself, or owner removes others.
create policy "members_select" on public.household_members
  for select to authenticated
  using (public.is_member(household_id));

create policy "members_update_owner" on public.household_members
  for update to authenticated
  using (public.is_owner(household_id))
  with check (public.is_owner(household_id));

create policy "members_delete" on public.household_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_owner(household_id));

-- invites: members read and revoke. Insert only via RPC.
create policy "invites_select" on public.invites
  for select to authenticated
  using (public.is_member(household_id));

create policy "invites_update_member" on public.invites
  for update to authenticated
  using (public.is_member(household_id))
  with check (public.is_member(household_id));

-- ---------- column-level write limits ---------------------------------
-- RLS decides WHICH rows; these grants decide WHICH columns a client may change.
-- Status / deletion / counters are only changed by server functions.

revoke insert, update on public.profiles          from anon, authenticated;
revoke insert, update on public.households        from anon, authenticated;
revoke insert, update on public.household_members from anon, authenticated;
revoke insert, update on public.invites           from anon, authenticated;

grant update (display_name, language, reminder_time, reminders_on) on public.profiles          to authenticated;
grant update (name, type, split_mode)                              on public.households        to authenticated;
grant update (role, color_index, share_percent)                    on public.household_members to authenticated;
grant update (revoked_at)                                          on public.invites           to authenticated;
