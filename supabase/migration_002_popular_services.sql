-- =====================================================================
-- BHD FILMS — MIGRATION 002: Popular Services flag
-- =====================================================================
-- Only run this if you already ran the original supabase/schema.sql
-- BEFORE this file was added to the project (i.e. your `services` table
-- doesn't have an `is_popular` column yet).
--
-- If you are setting up the project for the first time, you can skip
-- this file entirely — `is_popular` is already included in schema.sql.
--
-- What this adds: an admin-controlled "Mark as Popular" flag per service,
-- used by the customer Home page's "Popular Services" section. Nothing
-- is hard-coded - the Home page only shows services the admin flags here,
-- from the Services page's "Popular" checkbox.
-- =====================================================================

alter table public.services
  add column if not exists is_popular boolean not null default false;
