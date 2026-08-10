-- SmartTeacher Next
-- Backend Stripe dla jednego planu miesięcznego.
-- Projekt: smartteacher-next / Supabase: smartteacher-next-dev
-- Data: 2026-08-09
--
-- Zakres:
-- - trwałe mapowanie auth.users.id -> Stripe Customer,
-- - wersjonowanie ostatniego zdarzenia na subskrypcji,
-- - idempotentna synchronizacja webhooka w jednej transakcji,
-- - utworzenie albo zachowanie okresu użycia dla aktywnej subskrypcji.

begin;

do $$
declare
  v_table_name text;
begin
  foreach v_table_name in array array[
    'subscription_plans',
    'teacher_subscriptions',
    'subscription_usage_periods',
    'billing_webhook_events'
  ]
  loop
    if to_regclass('public.' || v_table_name) is null then
      raise exception
        'Brak public.%. Najpierw zastosuj fundament limitów.',
        v_table_name;
    end if;
  end loop;

  if to_regclass('public.billing_customers') is not null then
    raise exception
      'public.billing_customers już istnieje. Przerwano migrację do ręcznej weryfikacji.';
  end if;

  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'teacher_subscriptions'
      and c.column_name in (
        'provider_subscription_created_at',
        'provider_event_created_at',
        'provider_event_id'
      )
  ) then
    raise exception
      'Kolumny synchronizacji Stripe już istnieją. Przerwano migrację.';
  end if;

  if to_regprocedure(
    'public.sync_stripe_subscription_event(text,text,timestamp with time zone,boolean,uuid,text,text,text,text,timestamp with time zone,text,boolean,timestamp with time zone,timestamp with time zone,timestamp with time zone,timestamp with time zone)'
  ) is not null then
    raise exception
      'Funkcja sync_stripe_subscription_event już istnieje. Przerwano migrację.';
  end if;

  if exists (
    select 1
    from public.teacher_subscriptions
  ) then
    raise exception
      'teacher_subscriptions zawiera już rekordy. Wymagany jest osobny plan backfillu.';
  end if;

  if to_regprocedure(
    'public.set_updated_at()'
  ) is null then
    raise exception
      'Brak public.set_updated_at(). Przerwano migrację.';
  end if;
end;
$$;

create table public.billing_customers (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null unique
    references auth.users(id) on delete cascade,

  billing_provider text not null default 'stripe',
  provider_customer_id text not null unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint billing_customers_provider_check
    check (billing_provider = 'stripe'),

  constraint billing_customers_customer_not_empty_check
    check (btrim(provider_customer_id) <> ''),

  constraint billing_customers_owner_customer_unique
    unique (owner_id, provider_customer_id)
);

alter table public.teacher_subscriptions
add column provider_subscription_created_at timestamptz not null,
add column provider_event_created_at timestamptz not null,
add column provider_event_id text not null;

alter table public.teacher_subscriptions
drop constraint teacher_subscriptions_owner_id_key,
drop constraint teacher_subscriptions_provider_customer_id_key,
add constraint teacher_subscriptions_event_id_not_empty_check
  check (btrim(provider_event_id) <> ''),
add constraint teacher_subscriptions_customer_mapping_fkey
  foreign key (owner_id, provider_customer_id)
  references public.billing_customers (
    owner_id,
    provider_customer_id
  )
  on delete cascade;

create unique index teacher_subscriptions_owner_nonterminal_unique
on public.teacher_subscriptions (owner_id)
where status not in (
  'canceled',
  'incomplete_expired'
);

create index teacher_subscriptions_provider_customer_idx
on public.teacher_subscriptions (
  provider_customer_id,
  provider_subscription_created_at desc
);

create index teacher_subscriptions_provider_event_created_idx
on public.teacher_subscriptions (
  provider_event_created_at desc
);

alter table public.billing_customers
enable row level security;

revoke all
on table public.billing_customers
from public, anon, authenticated, service_role;

grant select, insert
on table public.billing_customers
to service_role;

create trigger billing_customers_set_updated_at
before update on public.billing_customers
for each row
execute function public.set_updated_at();

create function public.sync_stripe_subscription_event(
  p_provider_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_livemode boolean,
  p_owner_id uuid,
  p_plan_key text,
  p_provider_price_id text,
  p_provider_customer_id text,
  p_provider_subscription_id text,
  p_subscription_created_at timestamptz,
  p_status text,
  p_cancel_at_period_end boolean,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_canceled_at timestamptz,
  p_ended_at timestamptz
)
returns table (
  sync_state text,
  teacher_subscription_id uuid,
  usage_period_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_event public.billing_webhook_events%rowtype;
  v_plan public.subscription_plans%rowtype;
  v_customer public.billing_customers%rowtype;
  v_subscription public.teacher_subscriptions%rowtype;
  v_conflicting_subscription public.teacher_subscriptions%rowtype;
  v_usage public.subscription_usage_periods%rowtype;
begin
  if
    btrim(coalesce(p_provider_event_id, '')) = ''
    or btrim(coalesce(p_event_type, '')) = ''
    or p_event_created_at is null
    or p_livemode is null
    or p_owner_id is null
    or btrim(coalesce(p_plan_key, '')) = ''
    or btrim(coalesce(p_provider_price_id, '')) = ''
    or btrim(coalesce(p_provider_customer_id, '')) = ''
    or btrim(coalesce(p_provider_subscription_id, '')) = ''
    or p_subscription_created_at is null
    or btrim(coalesce(p_status, '')) = ''
    or p_cancel_at_period_end is null
    or p_current_period_start is null
    or p_current_period_end is null
    or p_current_period_start >= p_current_period_end
  then
    raise exception
      'Nieprawidłowy kontrakt zdarzenia Stripe.';
  end if;

  if p_status not in (
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'unpaid',
    'paused',
    'canceled'
  ) then
    raise exception
      'Nieobsługiwany status subskrypcji Stripe: %.',
      p_status;
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_owner_id
  ) then
    raise exception
      'Nie znaleziono użytkownika SmartTeacher dla webhooka Stripe.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_owner_id::text, 0)
  );

  insert into public.billing_webhook_events (
    billing_provider,
    provider_event_id,
    event_type,
    livemode,
    status
  )
  values (
    'stripe',
    btrim(p_provider_event_id),
    btrim(p_event_type),
    p_livemode,
    'processing'
  )
  on conflict (provider_event_id)
  do nothing;

  select bwe.*
  into strict v_event
  from public.billing_webhook_events bwe
  where bwe.provider_event_id = btrim(p_provider_event_id)
  for update;

  if
    v_event.event_type <> btrim(p_event_type)
    or v_event.livemode <> p_livemode
  then
    raise exception
      'Identyfikator zdarzenia Stripe ma niespójny typ albo tryb.';
  end if;

  if v_event.status = 'processed' then
    select ts.*
    into v_subscription
    from public.teacher_subscriptions ts
    where ts.provider_subscription_id =
      btrim(p_provider_subscription_id);

    return query
    select
      'duplicate'::text,
      v_subscription.id,
      null::uuid;

    return;
  end if;

  select sp.*
  into v_plan
  from public.subscription_plans sp
  where sp.plan_key = btrim(p_plan_key)
    and sp.billing_provider = 'stripe'
    and sp.provider_price_id = btrim(p_provider_price_id);

  if not found then
    raise exception
      'Cena Stripe nie jest przypisana do planu SmartTeacher.';
  end if;

  update public.billing_webhook_events bwe
  set
    status = 'processing',
    error_message = null,
    processed_at = null
  where bwe.id = v_event.id;

  select bc.*
  into v_customer
  from public.billing_customers bc
  where bc.owner_id = p_owner_id
  for update;

  if found then
    if
      v_customer.provider_customer_id <>
        btrim(p_provider_customer_id)
    then
      raise exception
        'Konto SmartTeacher jest przypisane do innego klienta Stripe.';
    end if;
  else
    if exists (
      select 1
      from public.billing_customers bc
      where bc.provider_customer_id =
        btrim(p_provider_customer_id)
        and bc.owner_id <> p_owner_id
    ) then
      raise exception
        'Klient Stripe jest przypisany do innego konta SmartTeacher.';
    end if;

    insert into public.billing_customers (
      owner_id,
      billing_provider,
      provider_customer_id
    )
    values (
      p_owner_id,
      'stripe',
      btrim(p_provider_customer_id)
    )
    returning *
    into v_customer;
  end if;

  select ts.*
  into v_subscription
  from public.teacher_subscriptions ts
  where ts.provider_subscription_id =
    btrim(p_provider_subscription_id)
  for update;

  if found then
    if
      v_subscription.owner_id <>
        p_owner_id
      or v_subscription.provider_customer_id <>
        btrim(p_provider_customer_id)
    then
      raise exception
        'Subskrypcja Stripe jest przypisana do innego konta albo klienta.';
    end if;

    update public.teacher_subscriptions ts
    set
      plan_id = v_plan.id,
      billing_provider = 'stripe',
      provider_subscription_created_at =
        p_subscription_created_at,
      provider_event_created_at = greatest(
        ts.provider_event_created_at,
        p_event_created_at
      ),
      provider_event_id = case
        when p_event_created_at >=
          ts.provider_event_created_at
          then btrim(p_provider_event_id)
        else ts.provider_event_id
      end,
      status = p_status,
      cancel_at_period_end =
        p_cancel_at_period_end,
      current_period_start =
        p_current_period_start,
      current_period_end =
        p_current_period_end,
      canceled_at = p_canceled_at,
      ended_at = p_ended_at
    where ts.id = v_subscription.id
    returning *
    into v_subscription;
  else
    select ts.*
    into v_conflicting_subscription
    from public.teacher_subscriptions ts
    where ts.owner_id = p_owner_id
      and ts.status not in (
        'canceled',
        'incomplete_expired'
      )
    for update;

    if found then
      raise exception
        'Konto SmartTeacher ma już nieterminalną subskrypcję Stripe.';
    end if;

    insert into public.teacher_subscriptions (
      owner_id,
      plan_id,
      billing_provider,
      provider_customer_id,
      provider_subscription_id,
      provider_subscription_created_at,
      provider_event_created_at,
      provider_event_id,
      status,
      cancel_at_period_end,
      current_period_start,
      current_period_end,
      canceled_at,
      ended_at
    )
    values (
      p_owner_id,
      v_plan.id,
      'stripe',
      btrim(p_provider_customer_id),
      btrim(p_provider_subscription_id),
      p_subscription_created_at,
      p_event_created_at,
      btrim(p_provider_event_id),
      p_status,
      p_cancel_at_period_end,
      p_current_period_start,
      p_current_period_end,
      p_canceled_at,
      p_ended_at
    )
    returning *
    into v_subscription;
  end if;

  if
    p_status = 'active'
  then
    select sup.*
    into v_usage
    from public.subscription_usage_periods sup
    where sup.subscription_id = v_subscription.id
      and sup.period_start = p_current_period_start
      and sup.period_end = p_current_period_end
    for update;

    if not found then
      select sup.*
      into v_usage
      from public.subscription_usage_periods sup
      where sup.subscription_id = v_subscription.id
        and sup.period_start = p_current_period_start
      order by sup.created_at desc
      limit 1
      for update;

      if found then
        update public.subscription_usage_periods sup
        set period_end = p_current_period_end
        where sup.id = v_usage.id
        returning *
        into v_usage;
      else
        insert into public.subscription_usage_periods (
          owner_id,
          plan_id,
          subscription_id,
          internal_entitlement_id,
          period_start,
          period_end,
          generation_limit
        )
        values (
          p_owner_id,
          v_plan.id,
          v_subscription.id,
          null,
          p_current_period_start,
          p_current_period_end,
          v_plan.generation_limit
        )
        returning *
        into v_usage;
      end if;
    end if;
  end if;

  update public.billing_webhook_events bwe
  set
    status = 'processed',
    error_message = null,
    processed_at = v_now
  where bwe.id = v_event.id;

  return query
  select
    'applied'::text,
    v_subscription.id,
    v_usage.id;
end;
$$;

comment on function public.sync_stripe_subscription_event(
  text,
  text,
  timestamptz,
  boolean,
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  boolean,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz
) is
  'Idempotentnie zapisuje zweryfikowane zdarzenie Stripe, aktualny snapshot subskrypcji i jej okres użycia.';

revoke all
on function public.sync_stripe_subscription_event(
  text,
  text,
  timestamptz,
  boolean,
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  boolean,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz
)
from public, anon, authenticated;

grant execute
on function public.sync_stripe_subscription_event(
  text,
  text,
  timestamptz,
  boolean,
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  boolean,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz
)
to service_role;

commit;

-- Kontrola po migracji: tabela, RLS i granty.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'billing_customers';

select
  g.table_name,
  g.grantee,
  g.privilege_type
from information_schema.role_table_grants g
where g.table_schema = 'public'
  and g.table_name = 'billing_customers'
  and g.grantee in (
    'anon',
    'authenticated',
    'service_role'
  )
order by g.grantee, g.privilege_type;

-- Kontrola po migracji: sygnatura, SECURITY DEFINER i EXECUTE.
select
  p.oid::regprocedure::text as identity,
  p.prosecdef as security_definer,
  has_function_privilege(
    'public',
    p.oid,
    'execute'
  ) as execute_public,
  has_function_privilege(
    'anon',
    p.oid,
    'execute'
  ) as execute_anon,
  has_function_privilege(
    'authenticated',
    p.oid,
    'execute'
  ) as execute_authenticated,
  has_function_privilege(
    'service_role',
    p.oid,
    'execute'
  ) as execute_service_role
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname =
    'sync_stripe_subscription_event';
