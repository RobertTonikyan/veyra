-- Web Push: browser subscriptions, activity pushes and scheduled reminders.
-- The edge function "push" does the sending; the database only tells it when.

create extension if not exists pg_net with schema extensions;

-- ---------- subscriptions (one row per browser/device) ----------
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint    text not null unique check (endpoint like 'https://%'),
  p256dh      text not null,
  auth        text not null,
  activity    boolean not null default true,   -- what others in the house do
  reminders   boolean not null default true,   -- morning summary, chores, birthdays, events
  created_at  timestamptz not null default now(),
  last_ok_at  timestamptz
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "push_own_select" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "push_own_update" on public.push_subscriptions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push_own_delete" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());
grant select, delete on public.push_subscriptions to authenticated;
grant update (activity, reminders) on public.push_subscriptions to authenticated;

-- Save this browser for the signed-in user. A browser is one endpoint: if another
-- account used it before on this device, that old row goes.
create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_activity boolean default true, p_reminders boolean default true)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(p_p256dh) > 200 or length(p_auth) > 100 then
    raise exception 'invalid_subscription';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id <> uid;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, activity, reminders)
  values (uid, p_endpoint, p_p256dh, p_auth, p_activity, p_reminders)
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth,
        activity = excluded.activity, reminders = excluded.reminders
  returning id into sid;
  return sid;
end;
$$;
revoke all on function public.save_push_subscription(text, text, text, boolean, boolean) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, boolean, boolean) to authenticated;

-- ---------- what was already sent (no duplicates) ----------
create table public.push_log (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  key      text not null,
  sent_at  timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.push_log enable row level security;  -- no policies: edge function (service role) only

-- ---------- shared secret between the database and the edge function ----------
-- Generated here, never leaves the server.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'push_secret', 'Veyra: DB → push function')
where not exists (select 1 from vault.secrets where name = 'push_secret');

create or replace function public.push_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'push_secret' and decrypted_secret = p_secret);
$$;
revoke all on function public.push_secret_ok(text) from public, anon, authenticated;
grant execute on function public.push_secret_ok(text) to service_role;

create or replace function public.call_push(p_body jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s text;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name = 'push_secret';
  perform net.http_post(
    url := 'https://eftymtavksmqennoyguf.supabase.co/functions/v1/push',
    body := p_body,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', s),
    timeout_milliseconds := 10000
  );
end;
$$;
revoke all on function public.call_push(jsonb) from public, anon, authenticated;

-- ---------- activity → push (only when someone else in the house has a browser subscribed) ----------
create or replace function public.activity_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind in ('shopping_added', 'chore_done', 'expense_added', 'settled', 'member_joined', 'kudos')
     and exists (
       select 1 from public.household_members m
       join public.push_subscriptions s on s.user_id = m.user_id and s.activity
       where m.household_id = new.household_id and m.user_id is distinct from new.actor)
  then
    perform public.call_push(jsonb_build_object('type', 'activity', 'id', new.id));
  end if;
  return null;
end;
$$;
revoke all on function public.activity_push() from public, anon, authenticated;

create trigger activity_push after insert on public.activity
  for each row execute function public.activity_push();

-- ---------- reminders: every 15 minutes the function checks what is due ----------
select cron.schedule('push_tick', '*/15 * * * *', $$ select public.call_push('{"type":"tick"}'::jsonb) $$);

-- keep the log small
select cron.schedule('push_log_cleanup', '17 4 * * *', $$ delete from public.push_log where sent_at < now() - interval '14 days' $$);
