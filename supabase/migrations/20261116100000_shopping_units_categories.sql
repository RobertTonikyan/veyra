-- =====================================================================
-- Veyra · 0006 · Shopping: amount + unit, valid categories, learned categories
-- =====================================================================
-- * amount + unit replace the free-text quantity (kept for old rows).
--   Units are stored as codes so every member sees them in their own language.
-- * category is either one of 10 codes or null = "not sorted yet" (the app asks).
-- * shopping_category_memory remembers what this house chose for an unknown
--   product, so "סוללות" is sorted automatically the next time.
-- =====================================================================

alter table public.shopping_items
  add column amount numeric(8, 2) check (amount > 0 and amount <= 99999),
  add column unit   text check (unit in ('unit', 'kg', 'g', 'l', 'ml', 'pack')),
  add constraint shopping_items_category_valid check (
    category is null or category in
      ('produce', 'dairy', 'bakery', 'meat', 'pantry', 'frozen', 'drinks', 'cleaning', 'personal', 'other')
  ),
  add constraint shopping_items_unit_needs_amount check (unit is null or amount is not null);

grant insert (amount, unit) on public.shopping_items to authenticated;
grant update (amount, unit) on public.shopping_items to authenticated;

create table public.shopping_category_memory (
  household_id  uuid not null references public.households (id) on delete cascade,
  name_key      text not null check (char_length(name_key) between 1 and 80),  -- lower-case, trimmed
  category      text not null check (category in
                  ('produce', 'dairy', 'bakery', 'meat', 'pantry', 'frozen', 'drinks', 'cleaning', 'personal', 'other')),
  updated_at    timestamptz not null default now(),
  primary key (household_id, name_key)
);

create trigger shopping_category_memory_updated_at
  before update on public.shopping_category_memory
  for each row execute function public.set_updated_at();

alter table public.shopping_category_memory enable row level security;

create policy "category_memory_all" on public.shopping_category_memory
  for all to authenticated
  using (public.is_member(household_id))
  with check (public.is_member(household_id));

revoke all on public.shopping_category_memory from anon;
