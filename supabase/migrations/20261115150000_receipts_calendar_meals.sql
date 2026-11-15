-- =====================================================================
-- Veyra · 0004 · Receipts (private Storage), calendar, recipes, meal plan
-- =====================================================================
-- Storage layout:  receipts/<household_id>/<uuid>.<ext>
-- The first folder decides who can read/write → only that household.
-- Recipes with household_id = null are the built-in ideas (seeded later,
-- one row per language), visible to everyone signed in, editable by no one.
-- =====================================================================

-- ---------- helper: membership from a text path segment --------------

create or replace function public.is_member_text(hid text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when hid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.is_member(hid::uuid)
    else false
  end;
$$;

revoke all on function public.is_member_text(text) from public, anon;
grant execute on function public.is_member_text(text) to authenticated;

-- ---------- receipts bucket ------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "receipts_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and public.is_member_text((storage.foldername(name))[1]));

create policy "receipts_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and public.is_member_text((storage.foldername(name))[1]));

create policy "receipts_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and public.is_member_text((storage.foldername(name))[1]));

-- link a receipt image to an expense (creator or payer only)
alter table public.expenses add column receipt_path text
  check (receipt_path is null or receipt_path ~ ('^' || household_id::text || '/'));

create policy "expenses_update_receipt" on public.expenses
  for update to authenticated
  using (public.is_member(household_id)
         and (created_by = (select auth.uid()) or paid_by = (select auth.uid())))
  with check (public.is_member(household_id));

grant update (receipt_path) on public.expenses to authenticated;

-- ---------- receipt_items (line items, for price history/insights) ---

create table public.receipt_items (
  id            uuid primary key default gen_random_uuid(),
  expense_id    uuid not null references public.expenses (id) on delete cascade,
  household_id  uuid not null references public.households (id) on delete cascade,
  name          text not null check (char_length(trim(name)) between 1 and 80),
  quantity      numeric(8, 2) not null default 1 check (quantity > 0),
  price_agorot  integer not null check (price_agorot >= 0),
  created_at    timestamptz not null default now()
);

create index receipt_items_household_name_idx on public.receipt_items (household_id, name);

alter table public.receipt_items enable row level security;

create policy "receipt_items_select" on public.receipt_items
  for select to authenticated using (public.is_member(household_id));
create policy "receipt_items_insert" on public.receipt_items
  for insert to authenticated
  with check (
    public.is_member(household_id)
    and exists (select 1 from public.expenses e
                where e.id = expense_id and e.household_id = receipt_items.household_id)
  );
create policy "receipt_items_update" on public.receipt_items
  for update to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "receipt_items_delete" on public.receipt_items
  for delete to authenticated using (public.is_member(household_id));

revoke insert, update on public.receipt_items from anon, authenticated;
grant insert (expense_id, household_id, name, quantity, price_agorot) on public.receipt_items to authenticated;
grant update (name, quantity, price_agorot) on public.receipt_items to authenticated;

-- ---------- events (shared calendar) ---------------------------------

create table public.events (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references public.households (id) on delete cascade,
  title             text not null check (char_length(trim(title)) between 1 and 80),
  starts_at         timestamptz not null,
  ends_at           timestamptz,
  all_day           boolean not null default false,
  location          text check (char_length(location) <= 120),
  notes             text check (char_length(notes) <= 1000),
  reminder_minutes  smallint check (reminder_minutes between 0 and 10080),
  created_by        uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index events_household_time_idx on public.events (household_id, starts_at);

alter table public.events enable row level security;

create policy "events_select" on public.events
  for select to authenticated using (public.is_member(household_id));
create policy "events_insert" on public.events
  for insert to authenticated
  with check (public.is_member(household_id) and created_by = (select auth.uid()));
create policy "events_update" on public.events
  for update to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "events_delete" on public.events
  for delete to authenticated using (public.is_member(household_id));

revoke insert, update on public.events from anon, authenticated;
grant insert (household_id, title, starts_at, ends_at, all_day, location, notes, reminder_minutes)
  on public.events to authenticated;
grant update (title, starts_at, ends_at, all_day, location, notes, reminder_minutes)
  on public.events to authenticated;

-- ---------- recipes --------------------------------------------------

create table public.recipes (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid references public.households (id) on delete cascade,  -- null = built-in
  locale        text check (locale in ('he', 'en', 'ru')),                  -- built-ins only
  title         text not null check (char_length(trim(title)) between 1 and 80),
  description   text check (char_length(description) <= 500),
  ingredients   jsonb not null default '[]'
                check (jsonb_typeof(ingredients) = 'array' and jsonb_array_length(ingredients) <= 60),
  steps         text[] not null default '{}' check (cardinality(steps) <= 40),
  prep_minutes  smallint check (prep_minutes between 0 and 1440),
  servings      smallint check (servings between 1 and 50),
  tags          text[] not null default '{}' check (cardinality(tags) <= 10),
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check ((household_id is null) = (locale is not null))
);

create index recipes_household_idx on public.recipes (household_id);
create index recipes_builtin_idx on public.recipes (locale) where household_id is null;

create trigger recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

alter table public.recipes enable row level security;

create policy "recipes_select" on public.recipes
  for select to authenticated
  using (household_id is null or public.is_member(household_id));
create policy "recipes_insert" on public.recipes
  for insert to authenticated
  with check (household_id is not null and public.is_member(household_id)
              and created_by = (select auth.uid()));
create policy "recipes_update" on public.recipes
  for update to authenticated
  using (household_id is not null and public.is_member(household_id))
  with check (household_id is not null and public.is_member(household_id));
create policy "recipes_delete" on public.recipes
  for delete to authenticated
  using (household_id is not null and public.is_member(household_id));

revoke insert, update on public.recipes from anon, authenticated;
grant insert (household_id, title, description, ingredients, steps, prep_minutes, servings, tags)
  on public.recipes to authenticated;
grant update (title, description, ingredients, steps, prep_minutes, servings, tags)
  on public.recipes to authenticated;

-- ---------- meal_plan ------------------------------------------------

create table public.meal_plan (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  day           date not null,
  slot          text not null check (slot in ('breakfast', 'lunch', 'dinner')),
  recipe_id     uuid references public.recipes (id) on delete set null,
  title         text check (char_length(title) <= 80),   -- free text when no recipe
  cook          uuid,
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  unique (household_id, day, slot),
  check (recipe_id is not null or title is not null),
  foreign key (household_id, cook)
    references public.household_members (household_id, user_id) on delete set null (cook)
);

alter table public.meal_plan enable row level security;

create policy "meal_plan_select" on public.meal_plan
  for select to authenticated using (public.is_member(household_id));
create policy "meal_plan_insert" on public.meal_plan
  for insert to authenticated
  with check (public.is_member(household_id) and created_by = (select auth.uid()));
create policy "meal_plan_update" on public.meal_plan
  for update to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "meal_plan_delete" on public.meal_plan
  for delete to authenticated using (public.is_member(household_id));

revoke insert, update on public.meal_plan from anon, authenticated;
grant insert (household_id, day, slot, recipe_id, title, cook) on public.meal_plan to authenticated;
grant update (day, slot, recipe_id, title, cook) on public.meal_plan to authenticated;

-- ---------- recipe → shopping list -----------------------------------
-- Adds a recipe's ingredients to the list, skipping ones already unchecked there.

create or replace function public.add_recipe_to_shopping(p_household uuid, p_recipe uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.recipes%rowtype;
  added integer;
begin
  if not public.is_member(p_household) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  select * into r from public.recipes
  where id = p_recipe and (household_id is null or household_id = p_household);
  if not found then
    raise exception 'recipe_not_found' using errcode = 'P0001';
  end if;

  with ing as (
    select distinct on (lower(trim(i ->> 'name')))
           left(trim(i ->> 'name'), 80) as name,
           left(nullif(trim(i ->> 'qty'), ''), 20) as qty
    from jsonb_array_elements(r.ingredients) as i
    where nullif(trim(i ->> 'name'), '') is not null
  ), ins as (
    insert into public.shopping_items (household_id, name, quantity, added_by)
    select p_household, ing.name, ing.qty, auth.uid()
    from ing
    where not exists (
      select 1 from public.shopping_items s
      where s.household_id = p_household and s.checked_at is null
        and lower(trim(s.name)) = lower(ing.name)
    )
    returning 1
  )
  select count(*) into added from ins;

  return added;
end;
$$;

revoke all on function public.add_recipe_to_shopping(uuid, uuid) from public, anon;
grant execute on function public.add_recipe_to_shopping(uuid, uuid) to authenticated;

-- ---------- realtime -------------------------------------------------

alter publication supabase_realtime
  add table public.events, public.meal_plan;
