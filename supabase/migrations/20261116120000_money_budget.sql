-- =====================================================================
-- Veyra · 0008 · Optional monthly budget for the house (shown on the money screen)
-- =====================================================================

alter table public.households
  add column monthly_budget_agorot integer check (monthly_budget_agorot between 1 and 100000000);

grant update (monthly_budget_agorot) on public.households to authenticated;
