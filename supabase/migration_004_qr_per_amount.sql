-- =====================================================================
-- BHD FILMS — migration 004: separate QR code picture per add-funds amount
-- =====================================================================
-- Only run this if your project's schema.sql was run BEFORE this feature
-- was added (i.e. Admin -> Payment Settings does not yet show a QR upload
-- row per amount). If you're setting up a brand-new project, skip this
-- file entirely - it's already included in schema.sql.
--
-- Safe to run more than once.
-- =====================================================================

create table if not exists public.payment_qr_codes (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2),
  qr_image_path text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create unique index if not exists payment_qr_codes_amount_uidx
  on public.payment_qr_codes (amount) where amount is not null;
create unique index if not exists payment_qr_codes_default_uidx
  on public.payment_qr_codes ((amount is null)) where amount is null;

alter table public.payment_qr_codes enable row level security;

drop trigger if exists trg_payment_qr_codes_updated on public.payment_qr_codes;
create trigger trg_payment_qr_codes_updated
  before update on public.payment_qr_codes
  for each row execute function public.set_updated_at();

create or replace function public.log_payment_qr_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit_log('payment_qr_changed','payment_qr_code', new.id::text, null, to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    perform public.write_audit_log('payment_qr_changed','payment_qr_code', new.id::text, to_jsonb(old), to_jsonb(new));
  elsif tg_op = 'DELETE' then
    perform public.write_audit_log('payment_qr_changed','payment_qr_code', old.id::text, to_jsonb(old), null);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_payment_qr_codes_audit on public.payment_qr_codes;
create trigger trg_payment_qr_codes_audit
  after insert or update or delete on public.payment_qr_codes
  for each row execute function public.log_payment_qr_audit();

drop policy if exists "payment_qr_codes_select" on public.payment_qr_codes;
create policy "payment_qr_codes_select" on public.payment_qr_codes
  for select using (auth.role() = 'authenticated' or public.is_admin());

drop policy if exists "payment_qr_codes_insert" on public.payment_qr_codes;
create policy "payment_qr_codes_insert" on public.payment_qr_codes
  for insert with check (public.has_permission('manage_payment_settings'));

drop policy if exists "payment_qr_codes_update" on public.payment_qr_codes;
create policy "payment_qr_codes_update" on public.payment_qr_codes
  for update using (public.has_permission('manage_payment_settings')) with check (public.has_permission('manage_payment_settings'));

drop policy if exists "payment_qr_codes_delete" on public.payment_qr_codes;
create policy "payment_qr_codes_delete" on public.payment_qr_codes
  for delete using (public.has_permission('manage_payment_settings'));
