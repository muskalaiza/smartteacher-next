-- SmartTeacher Next
-- Plan Free, publiczny kontrakt cennika i atomowe ograniczenia 1 + 1.
-- Projekt: smartteacher-next / Supabase: smartteacher-next-dev
-- Data: 2026-08-12
--
-- Kontrakt:
-- - Plan Free jest jednorazowy i przyznawany potwierdzonemu kontu,
-- - obejmuje jedną kartę pracy i jedną kartkówkę z tego samego tematu,
-- - temat zostaje utrwalony dopiero po pierwszym udanym generowaniu,
-- - cache HIT nie zużywa darmowego limitu,
-- - aktywacja Stripe bezpowrotnie kończy Plan Free,
-- - konto właścicielskie pozostaje bez zmian.

begin;

do $$
declare
  v_plan public.subscription_plans%rowtype;
begin
  if to_regclass('public.subscription_plans') is null
    or to_regclass('public.internal_entitlements') is null
    or to_regclass('public.subscription_usage_periods') is null
    or to_regclass('public.generation_quota_reservations') is null
    or to_regclass('public.generated_materials') is null
  then
    raise exception
      'Brak aktualnego fundamentu limitów i subskrypcji. Przerwano migrację.';
  end if;

  select sp.*
  into v_plan
  from public.subscription_plans sp
  where sp.plan_key = 'smartteacher_monthly_pln_v1';

  if not found
    or v_plan.price_gross_minor <> 2900
    or v_plan.generation_limit <> 20
    or v_plan.billing_interval <> 'month'
    or v_plan.billing_provider <> 'stripe'
  then
    raise exception
      'Plan miesięczny nie odpowiada kontraktowi 29 PLN / 20 generowań.';
  end if;

  if exists (
    select 1
    from public.internal_entitlements ie
    where ie.entitlement_type <> 'project_owner'
  ) then
    raise exception
      'Wykryto nieznany typ internal_entitlements. Przerwano migrację.';
  end if;
end;
$$;

alter table public.subscription_plans
  add column access_model text not null default 'recurring',
  add column worksheet_generation_limit smallint not null default 0,
  add column quiz_generation_limit smallint not null default 0,
  add column test_generation_limit smallint not null default 0,
  add column lesson_topic_limit smallint null;

update public.subscription_plans
set
  access_model = 'recurring',
  worksheet_generation_limit = generation_limit,
  quiz_generation_limit = generation_limit,
  test_generation_limit = generation_limit,
  lesson_topic_limit = null
where plan_key = 'smartteacher_monthly_pln_v1';

alter table public.subscription_plans
  drop constraint subscription_plans_price_check,
  drop constraint subscription_plans_interval_check,
  drop constraint subscription_plans_provider_check;

alter table public.subscription_plans
  add constraint subscription_plans_price_check
    check (price_gross_minor >= 0),

  add constraint subscription_plans_access_model_check
    check (access_model in ('one_time', 'recurring')),

  add constraint subscription_plans_interval_check
    check (
      (
        access_model = 'recurring'
        and billing_interval = 'month'
        and billing_interval_count = 1
      )
      or
      (
        access_model = 'one_time'
        and billing_interval = 'one_time'
        and billing_interval_count = 1
      )
    ),

  add constraint subscription_plans_provider_check
    check (billing_provider in ('internal', 'stripe')),

  add constraint subscription_plans_provider_contract_check
    check (
      (
        billing_provider = 'stripe'
        and access_model = 'recurring'
        and price_gross_minor > 0
      )
      or
      (
        billing_provider = 'internal'
        and access_model = 'one_time'
        and price_gross_minor = 0
        and provider_price_id is null
      )
    ),

  add constraint subscription_plans_material_limits_check
    check (
      worksheet_generation_limit >= 0
      and quiz_generation_limit >= 0
      and test_generation_limit >= 0
      and worksheet_generation_limit
        + quiz_generation_limit
        + test_generation_limit > 0
    ),

  add constraint subscription_plans_lesson_topic_limit_check
    check (
      lesson_topic_limit is null
      or lesson_topic_limit > 0
    );

insert into public.subscription_plans (
  plan_key,
  display_name,
  currency,
  price_gross_minor,
  billing_interval,
  billing_interval_count,
  generation_limit,
  billing_provider,
  provider_price_id,
  is_active,
  access_model,
  worksheet_generation_limit,
  quiz_generation_limit,
  test_generation_limit,
  lesson_topic_limit
)
values (
  'smartteacher_free_v1',
  'SmartTeacher — Plan Free',
  'PLN',
  0,
  'one_time',
  1,
  2,
  'internal',
  null,
  true,
  'one_time',
  1,
  1,
  0,
  1
);

alter table public.internal_entitlements
  add column lesson_topic_id uuid null,
  add column provisional_lesson_topic_id uuid null,
  add column worksheet_used boolean not null default false,
  add column worksheet_reserved boolean not null default false,
  add column quiz_used boolean not null default false,
  add column quiz_reserved boolean not null default false,
  add column converted_at timestamptz null;

alter table public.internal_entitlements
  drop constraint internal_entitlements_type_check;

alter table public.internal_entitlements
  add constraint internal_entitlements_type_check
    check (entitlement_type in ('free_plan', 'project_owner')),

  add constraint internal_entitlements_free_state_check
    check (
      (
        entitlement_type = 'project_owner'
        and lesson_topic_id is null
        and provisional_lesson_topic_id is null
        and worksheet_used = false
        and worksheet_reserved = false
        and quiz_used = false
        and quiz_reserved = false
        and converted_at is null
      )
      or
      (
        entitlement_type = 'free_plan'
        and (
          lesson_topic_id is not null
          or (
            worksheet_used = false
            and quiz_used = false
          )
        )
        and (
          status = 'active'
          or converted_at is not null
        )
      )
    );

create or replace function public.ensure_free_plan_entitlement(
  p_owner_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan_id uuid;
  v_entitlement_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  if p_owner_id is null then
    raise exception
      'Brak owner_id dla Planu Free.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_owner_id::text, 0)
  );

  select ie.id
  into v_entitlement_id
  from public.internal_entitlements ie
  where ie.owner_id = p_owner_id;

  if found then
    return case
      when exists (
        select 1
        from public.internal_entitlements ie
        where ie.id = v_entitlement_id
          and ie.entitlement_type = 'free_plan'
      )
        then v_entitlement_id
      else null
    end;
  end if;

  if exists (
    select 1
    from public.teacher_subscriptions ts
    where ts.owner_id = p_owner_id
  ) then
    return null;
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_owner_id
      and u.email_confirmed_at is not null
  ) then
    raise exception
      'free_plan_requires_confirmed_user';
  end if;

  select sp.id
  into strict v_plan_id
  from public.subscription_plans sp
  where sp.plan_key = 'smartteacher_free_v1'
    and sp.is_active = true;

  insert into public.internal_entitlements (
    owner_id,
    plan_id,
    entitlement_type,
    status,
    starts_at,
    ends_at,
    period_anchor,
    granted_reason
  )
  values (
    p_owner_id,
    v_plan_id,
    'free_plan',
    'active',
    v_now,
    null,
    v_now,
    'Jednorazowy Plan Free przyznany po potwierdzeniu konta.'
  )
  on conflict (owner_id) do nothing
  returning id
  into v_entitlement_id;

  if v_entitlement_id is null then
    select ie.id
    into v_entitlement_id
    from public.internal_entitlements ie
    where ie.owner_id = p_owner_id
      and ie.entitlement_type = 'free_plan';
  end if;

  return v_entitlement_id;
end;
$$;

comment on function public.ensure_free_plan_entitlement(uuid) is
  'Jednorazowo przyznaje Plan Free potwierdzonemu kontu bez historii subskrypcji Stripe.';

revoke all
on function public.ensure_free_plan_entitlement(uuid)
from public, anon, authenticated;

grant execute
on function public.ensure_free_plan_entitlement(uuid)
to service_role;

create or replace function public.guard_free_plan_reservation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entitlement public.internal_entitlements%rowtype;
  v_material public.generated_materials%rowtype;
  v_effective_topic_id uuid;
begin
  if new.state <> 'reserved' then
    return new;
  end if;

  select ie.*
  into v_entitlement
  from public.subscription_usage_periods sup
  join public.internal_entitlements ie
    on ie.id = sup.internal_entitlement_id
  where sup.id = new.usage_period_id
    and sup.owner_id = new.owner_id
    and ie.owner_id = new.owner_id
    and ie.entitlement_type = 'free_plan'
    and ie.status = 'active'
  for update of ie;

  if not found then
    return new;
  end if;

  select gm.*
  into strict v_material
  from public.generated_materials gm
  where gm.id = new.generated_material_id
    and gm.owner_id = new.owner_id;

  if v_material.material_type not in ('karta pracy', 'kartkówka')
    or v_material.lesson_topic_id is null
  then
    raise exception
      'free_plan_material_not_allowed';
  end if;

  v_effective_topic_id := coalesce(
    v_entitlement.lesson_topic_id,
    v_entitlement.provisional_lesson_topic_id,
    v_material.lesson_topic_id
  );

  if v_effective_topic_id <> v_material.lesson_topic_id then
    raise exception
      'free_plan_topic_mismatch';
  end if;

  if v_material.material_type = 'karta pracy' then
    if v_entitlement.worksheet_used
      or v_entitlement.worksheet_reserved
    then
      raise exception
        'free_plan_material_type_exhausted';
    end if;

    update public.internal_entitlements ie
    set
      worksheet_reserved = true,
      provisional_lesson_topic_id = v_effective_topic_id
    where ie.id = v_entitlement.id;
  else
    if v_entitlement.quiz_used
      or v_entitlement.quiz_reserved
    then
      raise exception
        'free_plan_material_type_exhausted';
    end if;

    update public.internal_entitlements ie
    set
      quiz_reserved = true,
      provisional_lesson_topic_id = v_effective_topic_id
    where ie.id = v_entitlement.id;
  end if;

  return new;
end;
$$;

create trigger generation_quota_reservations_free_guard
before insert on public.generation_quota_reservations
for each row
execute function public.guard_free_plan_reservation();

revoke all
on function public.guard_free_plan_reservation()
from public, anon, authenticated;

create or replace function public.finalize_free_plan_reservation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entitlement public.internal_entitlements%rowtype;
  v_material public.generated_materials%rowtype;
begin
  if old.state <> 'reserved'
    or new.state not in ('consumed', 'released')
  then
    return new;
  end if;

  select ie.*
  into v_entitlement
  from public.subscription_usage_periods sup
  join public.internal_entitlements ie
    on ie.id = sup.internal_entitlement_id
  where sup.id = new.usage_period_id
    and ie.entitlement_type = 'free_plan'
  for update of ie;

  if not found then
    return new;
  end if;

  select gm.*
  into v_material
  from public.generated_materials gm
  where gm.id = new.generated_material_id
    and gm.owner_id = new.owner_id;

  if not found then
    raise exception
      'Brak materiału powiązanego z rezerwacją Planu Free.';
  end if;

  if v_material.material_type = 'karta pracy' then
    update public.internal_entitlements ie
    set
      worksheet_reserved = false,
      worksheet_used = case
        when new.state = 'consumed' then true
        else ie.worksheet_used
      end,
      lesson_topic_id = case
        when new.state = 'consumed'
          then coalesce(ie.lesson_topic_id, v_material.lesson_topic_id)
        else ie.lesson_topic_id
      end
    where ie.id = v_entitlement.id;
  elsif v_material.material_type = 'kartkówka' then
    update public.internal_entitlements ie
    set
      quiz_reserved = false,
      quiz_used = case
        when new.state = 'consumed' then true
        else ie.quiz_used
      end,
      lesson_topic_id = case
        when new.state = 'consumed'
          then coalesce(ie.lesson_topic_id, v_material.lesson_topic_id)
        else ie.lesson_topic_id
      end
    where ie.id = v_entitlement.id;
  end if;

  update public.internal_entitlements ie
  set provisional_lesson_topic_id = case
    when ie.lesson_topic_id is not null
      then null
    when ie.worksheet_reserved or ie.quiz_reserved
      then ie.provisional_lesson_topic_id
    else null
  end
  where ie.id = v_entitlement.id;

  return new;
end;
$$;

create trigger generation_quota_reservations_free_finalize
after update of state on public.generation_quota_reservations
for each row
execute function public.finalize_free_plan_reservation();

revoke all
on function public.finalize_free_plan_reservation()
from public, anon, authenticated;

create or replace function public.end_free_plan_after_paid_activation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'active' then
    update public.internal_entitlements ie
    set
      status = 'revoked',
      converted_at = coalesce(ie.converted_at, clock_timestamp())
    where ie.owner_id = new.owner_id
      and ie.entitlement_type = 'free_plan'
      and ie.status = 'active';
  end if;

  return new;
end;
$$;

create trigger teacher_subscriptions_end_free_plan
after insert or update of status on public.teacher_subscriptions
for each row
execute function public.end_free_plan_after_paid_activation();

revoke all
on function public.end_free_plan_after_paid_activation()
from public, anon, authenticated;

comment on column public.subscription_plans.access_model is
  'Model dostępu: jednorazowy albo odnawiany cyklicznie.';

comment on column public.internal_entitlements.lesson_topic_id is
  'Temat utrwalony po pierwszym udanym generowaniu Planu Free.';

comment on column public.internal_entitlements.provisional_lesson_topic_id is
  'Temat aktywnej rezerwacji Planu Free przed pierwszą udaną finalizacją.';

comment on function public.guard_free_plan_reservation() is
  'Atomowo blokuje niedozwolony typ, drugi materiał tego samego typu i inny temat w Planie Free.';

comment on function public.finalize_free_plan_reservation() is
  'Po sukcesie utrwala wykorzystany typ i temat Planu Free, a po błędzie zwalnia slot.';

comment on function public.end_free_plan_after_paid_activation() is
  'Bezpowrotnie kończy Plan Free po aktywacji subskrypcji Stripe.';

commit;

-- Kontrola po migracji. Zapytania są odczytowe.
select
  sp.plan_key,
  sp.display_name,
  sp.price_gross_minor,
  sp.billing_interval,
  sp.generation_limit,
  sp.access_model,
  sp.worksheet_generation_limit,
  sp.quiz_generation_limit,
  sp.test_generation_limit,
  sp.lesson_topic_limit,
  sp.billing_provider,
  sp.is_active
from public.subscription_plans sp
where sp.plan_key in (
  'smartteacher_free_v1',
  'smartteacher_monthly_pln_v1'
)
order by sp.price_gross_minor;

select
  p.proname,
  p.prosecdef as security_definer,
  has_function_privilege('public', p.oid, 'execute') as public_execute,
  has_function_privilege('anon', p.oid, 'execute') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'execute') as service_role_execute
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'ensure_free_plan_entitlement';

select
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name
from pg_trigger t
join pg_class c
  on c.oid = t.tgrelid
join pg_namespace n
  on n.oid = c.relnamespace
join pg_proc p
  on p.oid = t.tgfoid
where n.nspname = 'public'
  and t.tgisinternal = false
  and t.tgname in (
    'generation_quota_reservations_free_guard',
    'generation_quota_reservations_free_finalize',
    'teacher_subscriptions_end_free_plan'
  )
order by t.tgname;
