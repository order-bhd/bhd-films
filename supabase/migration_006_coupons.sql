-- =====================================================================
-- BHD FILMS — migration 006: Coupon / Discount Code system
-- =====================================================================
-- Run this ONCE in Supabase SQL Editor (after migration_005). Safe to
-- run more than once (idempotent).
--
-- What this does:
--   1. Adds public.coupons (admin-managed discount codes, shown on the
--      Home page as a "festive offer" the customer can copy).
--   2. Adds public.coupon_redemptions (one row per time a coupon is
--      actually used on a real order — used to enforce per-user /
--      total usage limits).
--   3. Adds coupon_code + discount_amount columns to public.orders so
--      receipts and order history can show what was actually paid.
--   4. Replaces public.place_order with a version that accepts an
--      optional coupon code and applies the discount securely on the
--      server (the discount amount is always recalculated here — never
--      trusted from the browser).
--   5. Adds public.validate_coupon — used by the checkout screen to
--      preview a coupon's discount before the customer pays.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. coupons
-- ---------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  icon text not null default 'gift',
  discount_type text not null default 'fixed' check (discount_type in ('fixed', 'percent')),
  discount_value numeric not null check (discount_value > 0),
  max_discount_amount numeric,
  min_order_amount numeric not null default 0,
  usage_limit_per_user int,
  total_usage_limit int,
  times_used int not null default 0,
  is_active boolean not null default true,
  valid_from date,
  valid_until date,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.coupons enable row level security;

-- ---------------------------------------------------------------------
-- 2. coupon_redemptions — written only by the RPCs below, never
--    directly by the browser.
-- ---------------------------------------------------------------------
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  discount_amount numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_coupon_redemptions_coupon_user on public.coupon_redemptions (coupon_id, user_id);

alter table public.coupon_redemptions enable row level security;

-- ---------------------------------------------------------------------
-- 3. orders — track what a coupon actually did to an order. grand_total
--    keeps meaning exactly what it always has (the pre-discount
--    subtotal) so nothing that already reads it breaks; the amount
--    actually charged to the wallet is grand_total - discount_amount.
-- ---------------------------------------------------------------------
alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists discount_amount numeric not null default 0;

-- ---------------------------------------------------------------------
-- 4. RLS policies
-- ---------------------------------------------------------------------
drop policy if exists "coupons_select" on public.coupons;
create policy "coupons_select" on public.coupons
  for select using (
    (is_active = true and (valid_from is null or valid_from <= current_date) and (valid_until is null or valid_until >= current_date))
    or public.is_admin()
  );

drop policy if exists "coupons_insert" on public.coupons;
create policy "coupons_insert" on public.coupons
  for insert with check (public.has_permission('manage_coupons'));

drop policy if exists "coupons_update" on public.coupons;
create policy "coupons_update" on public.coupons
  for update using (public.has_permission('manage_coupons')) with check (public.has_permission('manage_coupons'));

drop policy if exists "coupons_delete" on public.coupons;
create policy "coupons_delete" on public.coupons
  for delete using (public.has_permission('manage_coupons'));

drop policy if exists "coupon_redemptions_select" on public.coupon_redemptions;
create policy "coupon_redemptions_select" on public.coupon_redemptions
  for select using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- 5. Audit log on coupon changes (same pattern already used for offers)
-- ---------------------------------------------------------------------
create or replace function public.log_coupon_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit_log('coupon_created', 'coupon', new.id::text, null, to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    perform public.write_audit_log('coupon_updated', 'coupon', new.id::text, to_jsonb(old), to_jsonb(new));
  elsif tg_op = 'DELETE' then
    perform public.write_audit_log('coupon_deleted', 'coupon', old.id::text, to_jsonb(old), null);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_coupons_audit on public.coupons;
create trigger trg_coupons_audit
  after insert or update or delete on public.coupons
  for each row execute function public.log_coupon_audit();

-- ---------------------------------------------------------------------
-- 6. validate_coupon — read-only preview used by the checkout screen.
--    Records nothing; the real, final check happens again inside
--    place_order below so nothing can be bypassed from the browser.
-- ---------------------------------------------------------------------
create or replace function public.validate_coupon(p_code text, p_order_amount numeric)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_coupon public.coupons%rowtype;
  v_discount numeric;
begin
  if v_user is null then
    raise exception 'You must be logged in.';
  end if;
  if p_code is null or length(trim(p_code)) = 0 then
    raise exception 'Please enter a coupon code.';
  end if;

  select * into v_coupon from public.coupons where upper(code) = upper(trim(p_code));
  if v_coupon.id is null then
    raise exception 'Invalid coupon code.';
  end if;
  if not v_coupon.is_active then
    raise exception 'This coupon is no longer active.';
  end if;
  if v_coupon.valid_from is not null and v_coupon.valid_from > current_date then
    raise exception 'This coupon is not active yet.';
  end if;
  if v_coupon.valid_until is not null and v_coupon.valid_until < current_date then
    raise exception 'This coupon has expired.';
  end if;
  if p_order_amount < v_coupon.min_order_amount then
    raise exception 'This coupon needs a minimum order of ₹%.', v_coupon.min_order_amount;
  end if;
  if v_coupon.total_usage_limit is not null and v_coupon.times_used >= v_coupon.total_usage_limit then
    raise exception 'This coupon has reached its usage limit.';
  end if;
  if v_coupon.usage_limit_per_user is not null then
    if (select count(*) from public.coupon_redemptions where coupon_id = v_coupon.id and user_id = v_user) >= v_coupon.usage_limit_per_user then
      raise exception 'You have already used this coupon.';
    end if;
  end if;

  if v_coupon.discount_type = 'percent' then
    v_discount := round(p_order_amount * v_coupon.discount_value / 100, 2);
    if v_coupon.max_discount_amount is not null and v_discount > v_coupon.max_discount_amount then
      v_discount := v_coupon.max_discount_amount;
    end if;
  else
    v_discount := v_coupon.discount_value;
  end if;
  if v_discount > p_order_amount then
    v_discount := p_order_amount;
  end if;

  return json_build_object(
    'valid', true,
    'code', v_coupon.code,
    'title', v_coupon.title,
    'discount_amount', v_discount,
    'payable_total', p_order_amount - v_discount
  );
end;
$$;

grant execute on function public.validate_coupon(text, numeric) to authenticated;

-- ---------------------------------------------------------------------
-- 7. place_order — replaced with a version that accepts an optional
--    coupon code. The old 2-argument version is dropped first so
--    Postgres doesn't end up with two ambiguous overloads.
-- ---------------------------------------------------------------------
drop function if exists public.place_order(jsonb, uuid);

create or replace function public.place_order(p_items jsonb, p_idempotency_key uuid default null, p_coupon_code text default null)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_item jsonb;
  v_service public.services%rowtype;
  v_tier public.service_price_tiers%rowtype;
  v_qty int;
  v_target text;
  v_rate numeric;
  v_item_total numeric;
  v_grand_total numeric := 0;
  v_category_id uuid;
  v_category_name text;
  v_order_id uuid;
  v_wallet public.wallets%rowtype;
  v_before numeric;
  v_after numeric;
  v_order_code text;
  v_est_time text;
  v_existing uuid;
  v_coupon public.coupons%rowtype;
  v_coupon_id uuid;
  v_discount_amount numeric := 0;
  v_payable_total numeric;
begin
  if v_user is null then
    raise exception 'You must be logged in to place an order.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'No services selected.';
  end if;

  if p_idempotency_key is not null then
    select id into v_existing from public.orders where idempotency_key = p_idempotency_key;
    if v_existing is not null then
      return (select json_build_object(
                'order_id', id, 'order_code', order_code, 'grand_total', grand_total,
                'discount_amount', discount_amount, 'coupon_code', coupon_code,
                'payable_total', grand_total - discount_amount, 'already_existed', true)
              from public.orders where id = v_existing);
    end if;
  end if;

  select * into v_wallet from public.wallets where user_id = v_user for update;
  if v_wallet is null then
    raise exception 'Wallet not found.';
  end if;

  create temporary table if not exists tmp_order_items (
    service_id uuid, service_name text, target_link text, quantity int, applied_rate numeric, item_total numeric
  ) on commit drop;
  delete from tmp_order_items;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_service from public.services where id = (v_item->>'service_id')::uuid and is_active = true;
    if v_service.id is null then
      raise exception 'One of the selected services is no longer available.';
    end if;

    v_qty := nullif(v_item->>'quantity','')::int;
    if v_qty is null or v_qty <= 0 then
      raise exception '%: please enter a valid quantity.', v_service.name;
    end if;
    if v_qty < v_service.min_quantity then
      raise exception '%: minimum quantity is %.', v_service.name, v_service.min_quantity;
    end if;
    if v_qty > v_service.max_quantity then
      raise exception '%: maximum quantity is %.', v_service.name, v_service.max_quantity;
    end if;

    v_target := nullif(trim(v_item->>'target_link'), '');
    if v_service.requires_target_link then
      if v_target is null or not public.validate_target_link(v_service.target_platform, v_target) then
        raise exception '%: please enter a valid % link.', v_service.name, initcap(v_service.target_platform);
      end if;
    end if;

    select * into v_tier from public.service_price_tiers
      where service_id = v_service.id and is_active = true
        and v_qty >= min_quantity and (max_quantity is null or v_qty <= max_quantity)
      order by min_quantity desc
      limit 1;

    if v_tier.id is not null then
      v_rate := v_tier.rate;
    else
      v_rate := v_service.base_rate;
    end if;

    v_item_total := round(v_rate * v_qty, 2);
    v_grand_total := v_grand_total + v_item_total;

    insert into tmp_order_items(service_id, service_name, target_link, quantity, applied_rate, item_total)
    values (v_service.id, v_service.name, v_target, v_qty, v_rate, v_item_total);

    if v_category_id is null then
      v_category_id := v_service.category_id;
      select name into v_category_name from public.categories where id = v_category_id;
    end if;
    if v_est_time is null then
      v_est_time := v_service.estimated_time_text;
    end if;

    v_tier := null;
  end loop;

  -- Coupon: re-validated here from scratch (never trust a discount
  -- amount computed in the browser) using the exact same rules as
  -- validate_coupon above.
  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select * into v_coupon from public.coupons where upper(code) = upper(trim(p_coupon_code));
    if v_coupon.id is null then
      raise exception 'Invalid coupon code.';
    end if;
    if not v_coupon.is_active then
      raise exception 'This coupon is no longer active.';
    end if;
    if v_coupon.valid_from is not null and v_coupon.valid_from > current_date then
      raise exception 'This coupon is not active yet.';
    end if;
    if v_coupon.valid_until is not null and v_coupon.valid_until < current_date then
      raise exception 'This coupon has expired.';
    end if;
    if v_grand_total < v_coupon.min_order_amount then
      raise exception 'This coupon needs a minimum order of ₹%.', v_coupon.min_order_amount;
    end if;
    if v_coupon.total_usage_limit is not null and v_coupon.times_used >= v_coupon.total_usage_limit then
      raise exception 'This coupon has reached its usage limit.';
    end if;
    if v_coupon.usage_limit_per_user is not null then
      if (select count(*) from public.coupon_redemptions where coupon_id = v_coupon.id and user_id = v_user) >= v_coupon.usage_limit_per_user then
        raise exception 'You have already used this coupon.';
      end if;
    end if;

    if v_coupon.discount_type = 'percent' then
      v_discount_amount := round(v_grand_total * v_coupon.discount_value / 100, 2);
      if v_coupon.max_discount_amount is not null and v_discount_amount > v_coupon.max_discount_amount then
        v_discount_amount := v_coupon.max_discount_amount;
      end if;
    else
      v_discount_amount := v_coupon.discount_value;
    end if;
    if v_discount_amount > v_grand_total then
      v_discount_amount := v_grand_total;
    end if;

    v_coupon_id := v_coupon.id;
  end if;

  v_payable_total := v_grand_total - v_discount_amount;

  if v_wallet.available_fund < v_payable_total then
    raise exception 'INSUFFICIENT_FUNDS:%', (v_payable_total - v_wallet.available_fund);
  end if;

  v_before := v_wallet.available_fund;
  v_after := v_before - v_payable_total;

  update public.wallets
  set available_fund = v_after, total_fund_used = total_fund_used + v_payable_total, updated_at = now()
  where id = v_wallet.id;

  v_order_code := public.generate_code('BHD');

  insert into public.orders(order_code, user_id, category_id, category_name_snapshot, grand_total, discount_amount, coupon_code, status, estimated_time_text, idempotency_key)
  values (v_order_code, v_user, v_category_id, v_category_name, v_grand_total, v_discount_amount, case when v_coupon_id is not null then v_coupon.code else null end, 'received', v_est_time, p_idempotency_key)
  returning id into v_order_id;

  insert into public.order_items(order_id, service_id, service_name_snapshot, target_link, quantity, applied_rate, item_total)
  select v_order_id, service_id, service_name, target_link, quantity, applied_rate, item_total from tmp_order_items;

  insert into public.wallet_transactions(wallet_id, user_id, type, amount, balance_before, balance_after, status, remark, related_order_id)
  values (
    v_wallet.id, v_user, 'fund_used', v_payable_total, v_before, v_after, 'completed',
    'Order ' || v_order_code || case when v_coupon_id is not null then ' (coupon ' || v_coupon.code || ' applied)' else '' end,
    v_order_id
  );

  if v_coupon_id is not null then
    insert into public.coupon_redemptions(coupon_id, user_id, order_id, discount_amount)
    values (v_coupon_id, v_user, v_order_id, v_discount_amount);
    update public.coupons set times_used = times_used + 1 where id = v_coupon_id;
  end if;

  insert into public.notifications(user_id, title, message, type, related_id)
  values (v_user, 'Order Placed', 'Your order ' || v_order_code || ' has been received.', 'order', v_order_id);

  return json_build_object(
    'order_id', v_order_id,
    'order_code', v_order_code,
    'grand_total', v_grand_total,
    'discount_amount', v_discount_amount,
    'coupon_code', case when v_coupon_id is not null then v_coupon.code else null end,
    'payable_total', v_payable_total,
    'remaining_balance', v_after,
    'estimated_time_text', v_est_time
  );
end;
$$;

grant execute on function public.place_order(jsonb, uuid, text) to authenticated;
