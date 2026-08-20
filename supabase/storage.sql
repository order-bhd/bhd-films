-- =====================================================================
-- BHD FILMS — SUPABASE STORAGE SETUP
-- Run this AFTER schema.sql, in the SQL Editor.
-- =====================================================================

-- Bucket for payment receipt screenshots. PRIVATE - not publicly readable.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Bucket for the admin's payment QR code image. Public - anyone logged in
-- needs to see it on the Add Funds screen, and it contains no personal data.
insert into storage.buckets (id, name, public)
values ('payment-qr', 'payment-qr', true)
on conflict (id) do nothing;

-- Bucket for support ticket attachments (screenshots / payment proof).
-- PRIVATE - not publicly readable, same per-customer-folder rule as receipts.
insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', false)
on conflict (id) do nothing;

-- ---------------- receipts bucket policies ----------------
-- Customers must upload to a path that starts with their own user id,
-- e.g. "receipts/<their-uid>/1699999999.jpg". The app code enforces this
-- path shape; these policies enforce it for real at the database level.

create policy "receipts_insert_own_folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "receipts_select_own_or_admin"
on storage.objects for select to authenticated
using (
  bucket_id = 'receipts'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

-- No update/delete policy is created on purpose: receipts must never be
-- edited or removed, preserving full re-upload history (spec #22).

-- ---------------- payment-qr bucket policies ----------------
create policy "payment_qr_public_read"
on storage.objects for select
using (bucket_id = 'payment-qr');

create policy "payment_qr_admin_write"
on storage.objects for insert to authenticated
with check (bucket_id = 'payment-qr' and public.has_permission('manage_payment_settings'));

create policy "payment_qr_admin_update"
on storage.objects for update to authenticated
using (bucket_id = 'payment-qr' and public.has_permission('manage_payment_settings'));

create policy "payment_qr_admin_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'payment-qr' and public.has_permission('manage_payment_settings'));

-- ---------------- support-attachments bucket policies ----------------
create policy "support_attachments_insert_own_folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'support-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "support_attachments_select_own_or_admin"
on storage.objects for select to authenticated
using (
  bucket_id = 'support-attachments'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
