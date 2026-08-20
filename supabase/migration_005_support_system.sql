-- =====================================================================
-- BHD FILMS — migration 005: Complete two-way Support & Smart Ticket System
-- =====================================================================
-- Run this ONCE in Supabase SQL Editor (after schema.sql / earlier
-- migrations). Safe to run more than once (idempotent).
--
-- What this does:
--   1. Adds public.support_tickets (one row per ticket, auto-linked to
--      the logged-in customer, with optional links to an existing order /
--      wallet transaction / fund request so nothing has to be re-typed).
--   2. Converts the existing public.support_messages table from a single
--      "contact form" row into the ticket CONVERSATION thread (customer
--      + admin messages, in order) — reusing the table instead of
--      creating a disconnected duplicate. Any real rows that already
--      exist (from the old contact form) are migrated into tickets
--      automatically so nothing is lost.
--   3. Reuses the existing public.notifications table for the
--      Notification Bell — no new notifications table needed.
--   4. Adds a `phone` column to profiles (optional — the app never
--      collected this before, so it can't be "auto-fetched" until a
--      customer fills it in once on their Profile page).
--   5. Adds the support-attachments storage bucket + policies.
--   6. Adds secure RPC functions — every write goes through one of
--      these so ownership/permission is always checked on the server,
--      never trusted from the browser.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. profiles.phone (optional, customer-fillable on the Profile page)
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists phone text;

-- ---------------------------------------------------------------------
-- 2. support_tickets
-- ---------------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_code text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('technical','payment','order','wallet','dropped','failed_transaction','receipt','other')),
  sub_category text,
  subject text not null,
  order_id uuid references public.orders(id) on delete set null,
  wallet_transaction_id uuid references public.wallet_transactions(id) on delete set null,
  fund_request_id uuid references public.fund_requests(id) on delete set null,
  transaction_ref text,
  payment_date date,
  amount numeric(12,2),
  failure_message text,
  occurred_location text,
  status text not null default 'open' check (status in ('open','in_progress','waiting_customer','resolved','closed')),
  has_unread_admin_reply boolean not null default false,
  has_unread_customer_message boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_user on public.support_tickets (user_id, created_at desc);
create index if not exists idx_support_tickets_status on public.support_tickets (status);
create index if not exists idx_support_tickets_order on public.support_tickets (order_id);
create index if not exists idx_support_tickets_unread_admin on public.support_tickets (has_unread_customer_message) where has_unread_customer_message = true;

alter table public.support_tickets enable row level security;

drop trigger if exists trg_support_tickets_updated on public.support_tickets;
create trigger trg_support_tickets_updated
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. support_messages — repurpose the existing table into the
--    ticket conversation thread. Add new columns first (nullable),
--    migrate any existing legacy rows into tickets, THEN tighten.
-- ---------------------------------------------------------------------
alter table public.support_messages add column if not exists ticket_id uuid references public.support_tickets(id) on delete cascade;
alter table public.support_messages add column if not exists sender_type text check (sender_type in ('customer','admin'));
alter table public.support_messages add column if not exists sender_id uuid references auth.users(id);
alter table public.support_messages add column if not exists attachment_url text;
alter table public.support_messages add column if not exists is_read boolean not null default false;

-- The legacy columns (name/email/subject) were NOT NULL on the old
-- contact-form table. The migration below inserts a new row for the
-- admin's old reply (if any) without those columns, so relax the
-- constraint first - they're dropped entirely a few statements down
-- anyway. Guarded so this is a no-op if already run once.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'support_messages' and column_name = 'name') then
    execute 'alter table public.support_messages alter column name drop not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'support_messages' and column_name = 'email') then
    execute 'alter table public.support_messages alter column email drop not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'support_messages' and column_name = 'subject') then
    execute 'alter table public.support_messages alter column subject drop not null';
  end if;
end $$;

-- Migrate legacy contact-form rows (old columns: name, email, subject,
-- message, status, admin_remark) into the new ticket model. Only rows
-- with a known user_id can become a real ticket (a ticket must belong to
-- a logged-in customer); any anonymous legacy row has no owner in the
-- new system and is removed as part of this one-time migration.
do $$
declare
  r record;
  v_ticket_id uuid;
  v_legacy_columns_exist boolean;
begin
  -- Guard so this whole block is a no-op on a second run (this migration
  -- file must be safe to run more than once). The legacy columns this
  -- loop reads are dropped further down, so their absence means the
  -- one-time migration already happened.
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'support_messages' and column_name = 'user_id'
  ) into v_legacy_columns_exist;

  if not v_legacy_columns_exist then
    return;
  end if;

  for r in
    select * from public.support_messages
    where ticket_id is null and user_id is not null
  loop
    insert into public.support_tickets (
      ticket_code, user_id, category, subject, status,
      has_unread_admin_reply, has_unread_customer_message,
      created_at, updated_at, last_message_at
    ) values (
      public.generate_code('TK'), r.user_id, 'other', coalesce(nullif(trim(r.subject), ''), 'Support request'),
      case r.status when 'open' then 'open' when 'responded' then 'in_progress' when 'closed' then 'closed' else 'open' end,
      false, r.status = 'open',
      r.created_at, r.updated_at, r.updated_at
    )
    returning id into v_ticket_id;

    update public.support_messages
    set ticket_id = v_ticket_id, sender_type = 'customer', sender_id = r.user_id, is_read = true
    where id = r.id;

    if r.admin_remark is not null and length(trim(r.admin_remark)) > 0 then
      insert into public.support_messages (ticket_id, sender_type, sender_id, message, is_read, created_at)
      values (v_ticket_id, 'admin', null, r.admin_remark, true, r.updated_at);
    end if;
  end loop;

  -- Anonymous legacy rows (no user_id) cannot belong to any customer in
  -- the new login-required ticket system — remove them.
  delete from public.support_messages where ticket_id is null;
end $$;

-- The OLD security policies (from before this migration) reference the
-- legacy columns directly, which blocks dropping them below. Remove the
-- old policies now; the new ones for this table are created in section 5.
drop policy if exists "support_select" on public.support_messages;
drop policy if exists "support_insert" on public.support_messages;
drop policy if exists "support_update_admin" on public.support_messages;

-- Now that every row has a ticket, tighten the columns and drop the old
-- single-message-form columns which are fully superseded by
-- support_tickets (subject/status) and this table's own message/ticket_id.
alter table public.support_messages alter column ticket_id set not null;
alter table public.support_messages alter column sender_type set not null;
alter table public.support_messages drop column if exists name;
alter table public.support_messages drop column if exists email;
alter table public.support_messages drop column if exists subject;
alter table public.support_messages drop column if exists status;
alter table public.support_messages drop column if exists admin_remark;
alter table public.support_messages drop column if exists user_id;
alter table public.support_messages drop column if exists updated_at;

create index if not exists idx_support_messages_ticket on public.support_messages (ticket_id, created_at);

-- The old "updated_at" trigger on this table no longer applies (column
-- dropped) — remove it so updates never fail.
drop trigger if exists trg_support_updated on public.support_messages;

-- ---------------------------------------------------------------------
-- 4. Storage bucket for support ticket attachments (private, same
--    per-customer-folder pattern as the existing "receipts" bucket).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', false)
on conflict (id) do nothing;

drop policy if exists "support_attachments_insert_own_folder" on storage.objects;
create policy "support_attachments_insert_own_folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'support-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "support_attachments_select_own_or_admin" on storage.objects;
create policy "support_attachments_select_own_or_admin"
on storage.objects for select to authenticated
using (
  bucket_id = 'support-attachments'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

-- ---------------------------------------------------------------------
-- 5. RLS policies — support_tickets / support_messages
--    (No direct INSERT/UPDATE policies on purpose: every write goes
--    through a SECURITY DEFINER RPC below, same pattern already used
--    for wallets / fund_requests / push_subscriptions in this app.)
-- ---------------------------------------------------------------------
drop policy if exists "support_tickets_select" on public.support_tickets;
create policy "support_tickets_select" on public.support_tickets
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "support_select" on public.support_messages;
create policy "support_select" on public.support_messages
  for select using (
    exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id
        and (t.user_id = auth.uid() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------
-- 6. RPC functions
-- ---------------------------------------------------------------------

-- Customer creates a new ticket + its first message. Every field the
-- app already knows (identity, and — when the customer picked an
-- existing order/wallet transaction/fund request — its ownership) is
-- verified server-side, never trusted from the browser.
create or replace function public.create_support_ticket(
  p_category text,
  p_subject text,
  p_message text,
  p_sub_category text default null,
  p_order_id uuid default null,
  p_wallet_transaction_id uuid default null,
  p_fund_request_id uuid default null,
  p_transaction_ref text default null,
  p_payment_date date default null,
  p_amount numeric default null,
  p_failure_message text default null,
  p_occurred_location text default null,
  p_attachment_url text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_ticket_id uuid;
  v_code text;
begin
  if v_user is null then
    raise exception 'You must be logged in.';
  end if;
  if p_category not in ('technical','payment','order','wallet','dropped','failed_transaction','receipt','other') then
    raise exception 'Invalid issue category.';
  end if;
  if p_subject is null or length(trim(p_subject)) = 0 then
    raise exception 'A subject is required.';
  end if;
  if p_message is null or length(trim(p_message)) = 0 then
    raise exception 'Please describe the issue.';
  end if;

  if p_order_id is not null and not exists (select 1 from public.orders where id = p_order_id and user_id = v_user) then
    raise exception 'That order was not found on your account.';
  end if;
  if p_wallet_transaction_id is not null and not exists (select 1 from public.wallet_transactions where id = p_wallet_transaction_id and user_id = v_user) then
    raise exception 'That wallet transaction was not found on your account.';
  end if;
  if p_fund_request_id is not null and not exists (select 1 from public.fund_requests where id = p_fund_request_id and user_id = v_user) then
    raise exception 'That fund request was not found on your account.';
  end if;

  v_code := public.generate_code('TK');

  insert into public.support_tickets (
    ticket_code, user_id, category, sub_category, subject,
    order_id, wallet_transaction_id, fund_request_id,
    transaction_ref, payment_date, amount, failure_message, occurred_location,
    has_unread_customer_message
  ) values (
    v_code, v_user, p_category, nullif(trim(coalesce(p_sub_category, '')), ''), trim(p_subject),
    p_order_id, p_wallet_transaction_id, p_fund_request_id,
    nullif(trim(coalesce(p_transaction_ref, '')), ''), p_payment_date, p_amount,
    nullif(trim(coalesce(p_failure_message, '')), ''), nullif(trim(coalesce(p_occurred_location, '')), ''),
    true
  ) returning id into v_ticket_id;

  insert into public.support_messages (ticket_id, sender_type, sender_id, message, attachment_url, is_read)
  values (v_ticket_id, 'customer', v_user, trim(p_message), p_attachment_url, false);

  return json_build_object('id', v_ticket_id, 'ticket_code', v_code);
end;
$$;

grant execute on function public.create_support_ticket(text, text, text, text, uuid, uuid, uuid, text, date, numeric, text, text, text) to authenticated;

-- Either the ticket owner (customer, continuing the conversation) or an
-- admin with manage_support (replying) can post a message. Admin replies
-- create an in-app notification for the customer automatically; the
-- email is sent separately by the frontend calling the send-support-email
-- Edge Function right after this succeeds (same pattern as push notifications).
create or replace function public.send_support_reply(
  p_ticket_id uuid,
  p_message text,
  p_attachment_url text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_ticket public.support_tickets%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'You must be logged in.';
  end if;
  if p_message is null or length(trim(p_message)) = 0 then
    raise exception 'Message cannot be empty.';
  end if;

  select * into v_ticket from public.support_tickets where id = p_ticket_id;
  if not found then
    raise exception 'Ticket not found.';
  end if;

  if v_ticket.user_id = v_uid then
    insert into public.support_messages (ticket_id, sender_type, sender_id, message, attachment_url, is_read)
    values (p_ticket_id, 'customer', v_uid, trim(p_message), p_attachment_url, false);

    update public.support_tickets
    set last_message_at = now(),
        has_unread_customer_message = true,
        status = case when status = 'waiting_customer' then 'open' else status end
    where id = p_ticket_id;

    return json_build_object('status', 'ok', 'as', 'customer');

  elsif public.has_permission('manage_support') then
    insert into public.support_messages (ticket_id, sender_type, sender_id, message, attachment_url, is_read)
    values (p_ticket_id, 'admin', v_uid, trim(p_message), p_attachment_url, false);

    update public.support_tickets
    set last_message_at = now(),
        has_unread_admin_reply = true
    where id = p_ticket_id;

    insert into public.notifications (user_id, title, message, type, related_id)
    values (
      v_ticket.user_id,
      'New Support Reply',
      'You have received a new reply from Support on ticket ' || v_ticket.ticket_code || '.',
      'support_reply',
      p_ticket_id
    );

    return json_build_object('status', 'ok', 'as', 'admin');

  else
    raise exception 'Not authorized.';
  end if;
end;
$$;

grant execute on function public.send_support_reply(uuid, text, text) to authenticated;

-- Admin-only status change.
create or replace function public.admin_update_ticket_status(p_ticket_id uuid, p_status text)
returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission('manage_support') then
    raise exception 'Not authorized.';
  end if;
  if p_status not in ('open','in_progress','waiting_customer','resolved','closed') then
    raise exception 'Invalid status.';
  end if;
  update public.support_tickets set status = p_status where id = p_ticket_id;
  if not found then
    raise exception 'Ticket not found.';
  end if;
  return json_build_object('status', 'ok');
end;
$$;

grant execute on function public.admin_update_ticket_status(uuid, text) to authenticated;

-- Called when either side OPENS a ticket: marks the other side's
-- messages as read, clears the relevant unread flag, and marks any
-- matching notification as read (so the bell badge count updates).
create or replace function public.mark_ticket_read(p_ticket_id uuid)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_ticket public.support_tickets%rowtype;
  v_uid uuid := auth.uid();
begin
  select * into v_ticket from public.support_tickets where id = p_ticket_id;
  if not found then
    raise exception 'Ticket not found.';
  end if;

  if v_ticket.user_id = v_uid then
    update public.support_messages set is_read = true where ticket_id = p_ticket_id and sender_type = 'admin' and is_read = false;
    update public.support_tickets set has_unread_admin_reply = false where id = p_ticket_id;
    update public.notifications set is_read = true where related_id = p_ticket_id and user_id = v_uid and is_read = false;
    return json_build_object('status', 'ok');

  elsif public.has_permission('manage_support') then
    update public.support_messages set is_read = true where ticket_id = p_ticket_id and sender_type = 'customer' and is_read = false;
    update public.support_tickets set has_unread_customer_message = false where id = p_ticket_id;
    return json_build_object('status', 'ok');

  else
    raise exception 'Not authorized.';
  end if;
end;
$$;

grant execute on function public.mark_ticket_read(uuid) to authenticated;

-- Drop the old single-message RPC — fully superseded by the functions above.
drop function if exists public.admin_update_support_message(uuid, text, text);
