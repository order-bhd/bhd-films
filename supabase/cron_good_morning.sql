-- =====================================================================
-- BHD FILMS — OPTIONAL: daily "Good Morning" push notification
-- =====================================================================
-- This is an advanced, OPTIONAL step. Skip it if you only want the
-- manual "Notify Customers" buttons (Offers / Rate Control) working -
-- those don't need anything in this file.
--
-- What this does: schedules a daily job, run entirely inside your
-- Supabase Postgres database, that calls the send-push Edge Function to
-- push a "Good Morning" notification to every subscribed device.
--
-- BEFORE running this file:
--   1. Deploy the send-push function (see SETUP.md) and confirm its URL,
--      e.g. https://xxxxx.supabase.co/functions/v1/send-push
--   2. Go to Database -> Extensions in the Supabase dashboard and enable
--      both "pg_cron" and "pg_net" (they're built in, just need enabling).
--   3. Get your project's service_role key from Project Settings -> API.
--      Treat it like a password - this SQL file will contain it. Only
--      ever run this in the Supabase SQL Editor of YOUR OWN project.
--
-- Replace BOTH placeholders below, then run this whole file once.
-- =====================================================================

select
  cron.schedule(
    'bhd-films-good-morning',
    '0 9 * * *',  -- 09:00 UTC every day - edit to taste (cron syntax, UTC time)
    $$
    select net.http_post(
      url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY'
      ),
      body := jsonb_build_object(
        'title', 'Good Morning ☀️',
        'body', 'New offers and fresh rates are live on BHD Films today.',
        'url', '/offers',
        'audience', 'all'
      )
    );
    $$
  );

-- To see scheduled jobs:      select * from cron.job;
-- To see recent run history:  select * from cron.job_run_details order by start_time desc limit 20;
-- To remove this job:         select cron.unschedule('bhd-films-good-morning');
