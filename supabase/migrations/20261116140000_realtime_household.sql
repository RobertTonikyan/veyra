-- =====================================================================
-- Veyra · 0010 · Live updates for house settings, members and profiles
-- =====================================================================
-- Without this, a change to the house (name, reward, budget, split mode),
-- to who's in it, or to someone's name/birthday only reached other phones
-- after a restart. RLS still applies to realtime: you only receive rows
-- you're allowed to read (your house, the people you live with).
-- =====================================================================

alter publication supabase_realtime
  add table public.households, public.household_members, public.profiles;
