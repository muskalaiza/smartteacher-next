-- Cena Stripe Sandbox dla planu startowego SmartTeacher:
-- 29,00 PLN miesięcznie / 20 nowych kompletów materiałów.
--
-- Ta migracja przypisuje istniejący obiekt Stripe Price do planu
-- dopiero po zatwierdzeniu ceny i limitu. Nie weryfikuje zdalnego
-- obiektu Stripe; robi to backend przed utworzeniem Checkout Session.

begin;

do $$
declare
  v_provider_price_id constant text := 'price_1U31CvIkqkfu7eeDNuEEBxj9';
  v_plan public.subscription_plans%rowtype;
begin
  if v_provider_price_id !~ '^price_[[:alnum:]]+$' then
    raise exception
      'Nieprawidłowy format identyfikatora ceny Stripe.';
  end if;

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
    or v_plan.generation_limit <> 20
    or v_plan.billing_provider <> 'stripe'
    or v_plan.is_active is not true
  then
    raise exception
      'Kontrakt planu smartteacher_monthly_pln_v1 jest niezgodny z zatwierdzonym planem startowym.';
  end if;

  -- Bezpieczne ponowne uruchomienie po zastosowaniu tej migracji.
  if v_plan.provider_price_id = v_provider_price_id then
    return;
  end if;

  if v_plan.provider_price_id is not null then
    raise exception
      'Plan ma już przypisany inny identyfikator ceny Stripe: %.',
      v_plan.provider_price_id;
  end if;

  if exists (
    select 1
    from public.subscription_plans sp
    where sp.billing_provider = 'stripe'
      and sp.provider_price_id = v_provider_price_id
      and sp.id <> v_plan.id
  ) then
    raise exception
      'Identyfikator ceny Stripe jest już przypisany do innego planu.';
  end if;

  if exists (
    select 1
    from public.teacher_subscriptions ts
    where ts.plan_id = v_plan.id
  ) then
    raise exception
      'Istnieje już subskrypcja Stripe dla planu. Przypisanie ceny zostało przerwane.';
  end if;

  update public.subscription_plans sp
  set provider_price_id = v_provider_price_id
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
