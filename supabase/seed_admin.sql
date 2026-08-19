-- =====================================================================
-- BHD FILMS — CREATE YOUR FIRST SUPER ADMIN
-- =====================================================================
-- Run schema.sql and storage.sql FIRST.
-- Then:
--   1. Sign up / log in to the BHD Films app once with the Google account
--      you want to use as the admin (this creates your auth user + profile).
--   2. Come back here, replace 'you@example.com' below with that exact
--      email address, and run this file in the Supabase SQL Editor.
-- =====================================================================

insert into public.admin_users (id, role, permissions)
select id, 'super_admin', '{}'::jsonb
from auth.users
where email = 'orde.bhd@gmail.com'
on conflict (id) do update set role = 'super_admin';

-- Verify it worked:
select u.email, a.role
from public.admin_users a
join auth.users u on u.id = a.id;
