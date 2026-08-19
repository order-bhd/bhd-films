-- =====================================================================
-- BHD FILMS — MIGRATION 003: Web Push notifications
-- =====================================================================
-- Only run this if you already ran the original supabase/schema.sql
-- BEFORE push notification support was added. If you are setting up the
-- project for the first time, skip this file - it's already included in
-- schema.sql.
-- =====================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_push_subs_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select" on public.push_subscriptions;
create policy "push_subscriptions_select" on public.push_subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns json
language plpgsql security definer set search_path = public as $$
begin
  if p_endpoint is null or p_p256dh is null or p_auth is null then
    raise exception 'Invalid subscription.';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set user_id = coalesce(auth.uid(), public.push_subscriptions.user_id),
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        last_seen_at = now();

  return json_build_object('status', 'ok');
end;
$$;

grant execute on function public.save_push_subscription(text, text, text, text) to anon, authenticated;

create or replace function public.remove_push_subscription(p_endpoint text)
returns json
language plpgsql security definer set search_path = public as $$
begin
  delete from public.push_subscriptions
  where endpoint = p_endpoint and (user_id is null or user_id = auth.uid());
  return json_build_object('status', 'ok');
end;
$$;

grant execute on function public.remove_push_subscription(text) to anon, authenticated;
