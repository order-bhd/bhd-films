-- =====================================================================
-- BHD FILMS — OPTIONAL SAMPLE DATA
-- =====================================================================
-- Completely optional. Run this if you want the app to show some real
-- categories/services/rates immediately instead of starting empty.
-- Everything here can be edited or deleted later from the Admin Panel -
-- none of it is hard-coded in the frontend code.
-- =====================================================================

do $$
declare
  v_instagram uuid;
  v_facebook uuid;
  v_youtube uuid;
  v_tiktok uuid;
  v_svc uuid;
begin
  insert into public.categories (name, slug, icon, description, display_order, is_active)
  values ('Instagram', 'instagram', 'instagram', 'Grow your Instagram presence', 1, true)
  returning id into v_instagram;

  insert into public.categories (name, slug, icon, description, display_order, is_active)
  values ('Facebook', 'facebook', 'facebook', 'Boost your Facebook page & posts', 2, true)
  returning id into v_facebook;

  insert into public.categories (name, slug, icon, description, display_order, is_active)
  values ('YouTube', 'youtube', 'youtube', 'Grow your channel', 3, true)
  returning id into v_youtube;

  insert into public.categories (name, slug, icon, description, display_order, is_active)
  values ('TikTok', 'tiktok', 'tiktok', 'Go viral on TikTok', 4, true)
  returning id into v_tiktok;

  -- Instagram services
  insert into public.services (category_id, name, description, min_quantity, max_quantity, base_rate, requires_target_link, target_platform, estimated_time_text, display_order)
  values (v_instagram, 'Followers', 'High quality Instagram followers', 100, 50000, 0.35, true, 'instagram', '1-3 hours', 1)
  returning id into v_svc;
  insert into public.service_price_tiers (service_id, min_quantity, max_quantity, rate, display_order) values
    (v_svc, 100, 999, 0.35, 1),
    (v_svc, 1000, 4999, 0.30, 2),
    (v_svc, 5000, 9999, 0.25, 3),
    (v_svc, 10000, null, 0.20, 4);

  insert into public.services (category_id, name, description, min_quantity, max_quantity, base_rate, requires_target_link, target_platform, estimated_time_text, display_order)
  values (v_instagram, 'Likes', 'Instant likes on your posts', 50, 20000, 0.10, true, 'instagram', '15-30 minutes', 2)
  returning id into v_svc;
  insert into public.service_price_tiers (service_id, min_quantity, max_quantity, rate, display_order) values
    (v_svc, 50, 999, 0.10, 1),
    (v_svc, 1000, 4999, 0.08, 2),
    (v_svc, 5000, null, 0.06, 3);

  insert into public.services (category_id, name, description, min_quantity, max_quantity, base_rate, requires_target_link, target_platform, estimated_time_text, display_order)
  values (v_instagram, 'Views', 'Reel & video views', 100, 1000000, 0.02, true, 'instagram', '30-60 minutes', 3);

  insert into public.services (category_id, name, description, min_quantity, max_quantity, base_rate, requires_target_link, target_platform, estimated_time_text, display_order)
  values (v_instagram, 'Comments', 'Custom or random comments', 10, 5000, 0.80, true, 'instagram', '2-4 hours', 4);

  -- Facebook services
  insert into public.services (category_id, name, description, min_quantity, max_quantity, base_rate, requires_target_link, target_platform, estimated_time_text, display_order)
  values (v_facebook, 'Page Likes', 'Grow your Facebook page', 100, 20000, 0.40, true, 'facebook', '2-6 hours', 1);
  insert into public.services (category_id, name, description, min_quantity, max_quantity, base_rate, requires_target_link, target_platform, estimated_time_text, display_order)
  values (v_facebook, 'Post Likes', 'Boost engagement on a post', 50, 10000, 0.15, true, 'facebook', '30-60 minutes', 2);
  insert into public.services (category_id, name, description, min_quantity, max_quantity, base_rate, requires_target_link, target_platform, estimated_time_text, display_order)
  values (v_facebook, 'Video Views', 'Views for Facebook videos', 100, 500000, 0.03, true, 'facebook', '1-2 hours', 3);

  -- YouTube services
  insert into public.services (category_id, name, description, min_quantity, max_quantity, base_rate, requires_target_link, target_platform, estimated_time_text, display_order)
  values (v_youtube, 'Views', 'Real YouTube video views', 500, 1000000, 0.05, true, 'youtube', '6-24 hours', 1);
  insert into public.services (category_id, name, description, min_quantity, max_quantity, base_rate, requires_target_link, target_platform, estimated_time_text, display_order)
  values (v_youtube, 'Subscribers', 'Grow your channel', 50, 20000, 0.90, true, 'youtube', '12-24 hours', 2);
  insert into public.services (category_id, name, description, min_quantity, max_quantity, base_rate, requires_target_link, target_platform, estimated_time_text, display_order)
  values (v_youtube, 'Likes', 'Video likes', 50, 20000, 0.20, true, 'youtube', '1-3 hours', 3);

  -- TikTok services
  insert into public.services (category_id, name, description, min_quantity, max_quantity, base_rate, requires_target_link, target_platform, estimated_time_text, display_order)
  values (v_tiktok, 'Followers', 'TikTok followers', 100, 50000, 0.30, true, 'tiktok', '1-3 hours', 1);
  insert into public.services (category_id, name, description, min_quantity, max_quantity, base_rate, requires_target_link, target_platform, estimated_time_text, display_order)
  values (v_tiktok, 'Likes', 'TikTok video likes', 50, 20000, 0.09, true, 'tiktok', '30-60 minutes', 2);
  insert into public.services (category_id, name, description, min_quantity, max_quantity, base_rate, requires_target_link, target_platform, estimated_time_text, display_order)
  values (v_tiktok, 'Views', 'TikTok video views', 100, 1000000, 0.01, true, 'tiktok', '15-30 minutes', 3);

  -- A sample offer
  insert into public.offers (title, description, icon, gradient, is_active, display_order)
  values ('Welcome Offer', 'New here? Get the best rates on your first order.', 'sparkles', 'gold', true, 1);
end $$;
