-- Cena startowa SmartTeacher:
-- 29,00 PLN brutto miesięcznie / 50 generowań.
--
-- Ta migracja koryguje wyłącznie cenę istniejącego planu przed
-- przypisaniem ceny Stripe i przed utworzeniem pierwszej subskrypcji.
-- Historyczna migracja fundamentu limitów pozostaje bez zmian.

begin;

do $$
declare
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
    or v_plan.billing_interval <> 'month'
    or v_plan.billing_interval_count <> 1
    or v_plan.generation_limit <> 50
    or v_plan.billing_provider <> 'stripe'
    or v_plan.is_active is not true
  then
    raise exception
      'Kontrakt planu smartteacher_monthly_pln_v1 jest niezgodny z zatwierdzonym planem startowym.';
  end if;

  -- Bezpieczne ponowne uruchomienie po zastosowaniu tej migracji.
  if v_plan.price_gross_minor = 2900 then
    return;
  end if;

  if v_plan.price_gross_minor <> 3900 then
    raise exception
      'Nieoczekiwana cena planu: % groszy.',
      v_plan.price_gross_minor;
  end if;

  if v_plan.provider_price_id is not null then
    raise exception
      'Cena Stripe jest już przypisana. Migracja ceny startowej została przerwana.';
  end if;

  if exists (
    select 1
    from public.teacher_subscriptions ts
    where ts.plan_id = v_plan.id
  ) then
    raise exception
      'Istnieje już subskrypcja Stripe dla planu. Migracja ceny startowej została przerwana.';
  end if;

  update public.subscription_plans sp
  set price_gross_minor = 2900
  where sp.id = v_plan.id;
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
