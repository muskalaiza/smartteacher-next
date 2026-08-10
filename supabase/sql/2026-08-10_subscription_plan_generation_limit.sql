-- Limit startowy SmartTeacher:
-- 29,00 PLN brutto miesięcznie / 20 nowych kompletów materiałów.
--
-- Ta migracja koryguje limit istniejącego planu przed
-- przypisaniem ceny Stripe i przed utworzeniem pierwszej subskrypcji.
-- Zakończone okresy użycia zachowują historyczny snapshot limitu.

begin;

do $$
declare
  v_now timestamptz := clock_timestamp();
  v_owner_id uuid;
  v_plan public.subscription_plans%rowtype;
begin
  select sp.*
  into v_plan
  from public.subscription_plans sp
  where sp.plan_key = 'smartteacher_monthly_pln_v1'
  for update;

  if not found then
    raise exception
      'Nie znaleziono planu smartteacher_monthly_pln_v1.';
  end if;

  if
    v_plan.currency <> 'PLN'
    or v_plan.price_gross_minor <> 2900
    or v_plan.billing_interval <> 'month'
    or v_plan.billing_interval_count <> 1
    or v_plan.billing_provider <> 'stripe'
    or v_plan.is_active is not true
  then
    raise exception
      'Kontrakt planu smartteacher_monthly_pln_v1 jest niezgodny z zatwierdzonym planem startowym.';
  end if;

  -- Bezpieczne ponowne uruchomienie po zastosowaniu tej migracji.
  if v_plan.generation_limit = 20 then
    return;
  end if;

  if v_plan.generation_limit <> 50 then
    raise exception
      'Nieoczekiwany limit planu: %.',
      v_plan.generation_limit;
  end if;

  if v_plan.provider_price_id is not null then
    raise exception
      'Cena Stripe jest już przypisana. Migracja limitu startowego została przerwana.';
  end if;

  if exists (
    select 1
    from public.teacher_subscriptions ts
    where ts.plan_id = v_plan.id
  ) then
    raise exception
      'Istnieje już subskrypcja Stripe dla planu. Migracja limitu startowego została przerwana.';
  end if;

  -- Generator używa tej samej blokady dla operacji limitu właściciela.
  -- Dzięki temu migracja nie minie się z równoległym cache MISS.
  for v_owner_id in
    select ie.owner_id
    from public.internal_entitlements ie
    where ie.plan_id = v_plan.id
      and ie.status = 'active'
      and ie.starts_at <= v_now
      and (
        ie.ends_at is null
        or v_now < ie.ends_at
      )
    order by ie.owner_id
  loop
    perform pg_advisory_xact_lock(
      hashtextextended(v_owner_id::text, 0)
    );
  end loop;

  -- Trwający okres właścicielski może przejść na limit 20 tylko wtedy,
  -- gdy zachowuje constraint used_count + reserved_count <= generation_limit.
  if exists (
    select 1
    from public.subscription_usage_periods sup
    where sup.plan_id = v_plan.id
      and sup.internal_entitlement_id is not null
      and sup.period_start <= v_now
      and v_now < sup.period_end
      and sup.used_count + sup.reserved_count > 20
    for update
  ) then
    raise exception
      'Bieżące użycie przekracza nowy limit 20. Migracja została przerwana.';
  end if;

  if exists (
    select 1
    from public.subscription_usage_periods sup
    where sup.plan_id = v_plan.id
      and sup.internal_entitlement_id is not null
      and sup.period_start <= v_now
      and v_now < sup.period_end
      and sup.generation_limit <> 50
    for update
  ) then
    raise exception
      'Bieżący okres właścicielski ma nieoczekiwany limit. Migracja została przerwana.';
  end if;

  update public.subscription_plans sp
  set generation_limit = 20
  where sp.id = v_plan.id;

  update public.subscription_usage_periods sup
  set generation_limit = 20
  where sup.plan_id = v_plan.id
    and sup.internal_entitlement_id is not null
    and sup.period_start <= v_now
    and v_now < sup.period_end;
end;
$$;

commit;

select
  sp.plan_key,
  sp.display_name,
  sp.currency,
  sp.price_gross_minor,
  sp.billing_interval,
  sp.billing_interval_count,
  sp.generation_limit,
  sp.billing_provider,
  sp.provider_price_id,
  sp.is_active
from public.subscription_plans sp
where sp.plan_key = 'smartteacher_monthly_pln_v1';

select
  case
    when sup.internal_entitlement_id is not null
      then 'internal_entitlement'
    else 'stripe_subscription'
  end as period_source,
  sup.period_start,
  sup.period_end,
  sup.generation_limit,
  sup.used_count,
  sup.reserved_count
from public.subscription_usage_periods sup
join public.subscription_plans sp
  on sp.id = sup.plan_id
where sp.plan_key = 'smartteacher_monthly_pln_v1'
  and sup.period_start <= now()
  and now() < sup.period_end
order by sup.owner_id, sup.period_start;
