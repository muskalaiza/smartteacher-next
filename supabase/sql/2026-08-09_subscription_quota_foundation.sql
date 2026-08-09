-- SmartTeacher Next
-- Fundament subskrypcji i atomowego limitu Generatora.
-- Projekt: smartteacher-next / Supabase: smartteacher-next-dev
-- Data: 2026-08-09
--
-- Zatwierdzony kontrakt:
-- - jeden plan miesięczny: 39,00 zł brutto,
-- - 50 generowań w okresie rozliczeniowym,
-- - jeden udany cache MISS = jedna wykorzystana jednostka,
-- - cache HIT nie zużywa limitu,
-- - błąd Generatora zwalnia wcześniejszą rezerwację,
-- - konto właścicielskie ma wewnętrzne uprawnienie po auth.users.id,
-- - telemetria ai_usage_events nie jest licznikiem limitu.

begin;

-- Kontrola wstępna względem snapshotu live Supabase z 2026-08-09.
do $$
declare
  v_claim_oid oid;
  v_table_name text;
begin
  if to_regclass('public.generated_materials') is null then
    raise exception
      'Brak public.generated_materials. Przerwano migrację.';
  end if;

  if to_regclass('public.teacher_documents') is null then
    raise exception
      'Brak public.teacher_documents. Przerwano migrację.';
  end if;

  foreach v_table_name in array array[
    'subscription_plans',
    'teacher_subscriptions',
    'internal_entitlements',
    'subscription_usage_periods',
    'generation_quota_reservations',
    'billing_webhook_events'
  ]
  loop
    if to_regclass('public.' || v_table_name) is not null then
      raise exception
        'Tabela public.% już istnieje. Przerwano migrację do ręcznej weryfikacji.',
        v_table_name;
    end if;
  end loop;

  select p.oid
  into v_claim_oid
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.oid = to_regprocedure(
      'public.claim_generated_material(uuid,uuid,uuid,uuid,text,text,text,text,integer,text[],jsonb,text,text,text,text,text,text)'
    );

  if v_claim_oid is null then
    raise exception
      'Brak aktualnej sygnatury public.claim_generated_material. Przerwano migrację.';
  end if;

  if not exists (
    select 1
    from pg_proc p
    where p.oid = v_claim_oid
      and p.prosecdef
  ) then
    raise exception
      'claim_generated_material nie jest SECURITY DEFINER. Przerwano migrację.';
  end if;

  if
    has_function_privilege('public', v_claim_oid, 'execute')
    or has_function_privilege('anon', v_claim_oid, 'execute')
    or has_function_privilege('authenticated', v_claim_oid, 'execute')
    or not has_function_privilege('service_role', v_claim_oid, 'execute')
  then
    raise exception
      'Granty claim_generated_material nie odpowiadają kontraktowi service_role-only.';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = '5f066c58-e4c8-4228-b161-4d573da8655d'::uuid
  ) then
    raise exception
      'Nie znaleziono zatwierdzonego konta właścicielskiego w auth.users.';
  end if;
end;
$$;

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),

  plan_key text not null unique,
  display_name text not null,

  currency text not null,
  price_gross_minor integer not null,
  billing_interval text not null,
  billing_interval_count smallint not null default 1,
  generation_limit integer not null,

  billing_provider text not null default 'stripe',
  provider_price_id text null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint subscription_plans_plan_key_not_empty_check
    check (btrim(plan_key) <> ''),

  constraint subscription_plans_display_name_not_empty_check
    check (btrim(display_name) <> ''),

  constraint subscription_plans_currency_check
    check (currency = upper(currency) and char_length(currency) = 3),

  constraint subscription_plans_price_check
    check (price_gross_minor > 0),

  constraint subscription_plans_interval_check
    check (
      billing_interval = 'month'
      and billing_interval_count = 1
    ),

  constraint subscription_plans_generation_limit_check
    check (generation_limit > 0),

  constraint subscription_plans_provider_check
    check (billing_provider = 'stripe'),

  constraint subscription_plans_provider_price_not_empty_check
    check (
      provider_price_id is null
      or btrim(provider_price_id) <> ''
    )
);

create unique index subscription_plans_provider_price_unique
on public.subscription_plans (
  billing_provider,
  provider_price_id
)
where provider_price_id is not null;

create table public.teacher_subscriptions (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null unique
    references auth.users(id) on delete cascade,

  plan_id uuid not null
    references public.subscription_plans(id) on delete restrict,

  billing_provider text not null default 'stripe',
  provider_customer_id text not null unique,
  provider_subscription_id text not null unique,

  status text not null,
  cancel_at_period_end boolean not null default false,

  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  canceled_at timestamptz null,
  ended_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint teacher_subscriptions_provider_check
    check (billing_provider = 'stripe'),

  constraint teacher_subscriptions_customer_not_empty_check
    check (btrim(provider_customer_id) <> ''),

  constraint teacher_subscriptions_subscription_not_empty_check
    check (btrim(provider_subscription_id) <> ''),

  constraint teacher_subscriptions_status_check
    check (
      status in (
        'incomplete',
        'incomplete_expired',
        'trialing',
        'active',
        'past_due',
        'unpaid',
        'paused',
        'canceled'
      )
    ),

  constraint teacher_subscriptions_period_check
    check (current_period_start < current_period_end),

  constraint teacher_subscriptions_ended_at_check
    check (
      ended_at is null
      or ended_at >= current_period_start
    )
);

create index teacher_subscriptions_status_period_idx
on public.teacher_subscriptions (
  status,
  current_period_end
);

create table public.internal_entitlements (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null unique
    references auth.users(id) on delete cascade,

  plan_id uuid not null
    references public.subscription_plans(id) on delete restrict,

  entitlement_type text not null,
  status text not null default 'active',

  starts_at timestamptz not null,
  ends_at timestamptz null,
  period_anchor timestamptz not null,

  granted_reason text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint internal_entitlements_type_check
    check (entitlement_type = 'project_owner'),

  constraint internal_entitlements_status_check
    check (status in ('active', 'revoked')),

  constraint internal_entitlements_period_check
    check (
      period_anchor = starts_at
      and (
        ends_at is null
        or starts_at < ends_at
      )
    ),

  constraint internal_entitlements_reason_not_empty_check
    check (btrim(granted_reason) <> '')
);

create table public.subscription_usage_periods (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    references auth.users(id) on delete cascade,

  plan_id uuid not null
    references public.subscription_plans(id) on delete restrict,

  subscription_id uuid null
    references public.teacher_subscriptions(id) on delete cascade,

  internal_entitlement_id uuid null
    references public.internal_entitlements(id) on delete cascade,

  period_start timestamptz not null,
  period_end timestamptz not null,

  generation_limit integer not null,
  used_count integer not null default 0,
  reserved_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint subscription_usage_periods_source_check
    check (
      (subscription_id is not null)::integer
      + (internal_entitlement_id is not null)::integer
      = 1
    ),

  constraint subscription_usage_periods_dates_check
    check (period_start < period_end),

  constraint subscription_usage_periods_limit_check
    check (generation_limit > 0),

  constraint subscription_usage_periods_counters_check
    check (
      used_count >= 0
      and reserved_count >= 0
      and used_count + reserved_count <= generation_limit
    )
);

create unique index subscription_usage_periods_subscription_unique
on public.subscription_usage_periods (
  subscription_id,
  period_start,
  period_end
)
where subscription_id is not null;

create unique index subscription_usage_periods_entitlement_unique
on public.subscription_usage_periods (
  internal_entitlement_id,
  period_start,
  period_end
)
where internal_entitlement_id is not null;

create index subscription_usage_periods_owner_period_idx
on public.subscription_usage_periods (
  owner_id,
  period_end desc
);

create table public.generation_quota_reservations (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    references auth.users(id) on delete cascade,

  usage_period_id uuid not null
    references public.subscription_usage_periods(id) on delete cascade,

  generated_material_id uuid null
    references public.generated_materials(id) on delete set null,

  reservation_started_at timestamptz not null,
  state text not null default 'reserved',

  reserved_at timestamptz not null default now(),
  consumed_at timestamptz null,
  released_at timestamptz null,
  release_reason text null,

  constraint generation_quota_reservations_state_check
    check (state in ('reserved', 'consumed', 'released')),

  constraint generation_quota_reservations_state_dates_check
    check (
      (
        state = 'reserved'
        and consumed_at is null
        and released_at is null
        and release_reason is null
      )
      or
      (
        state = 'consumed'
        and consumed_at is not null
        and released_at is null
        and release_reason is null
      )
      or
      (
        state = 'released'
        and consumed_at is null
        and released_at is not null
        and btrim(coalesce(release_reason, '')) <> ''
      )
    )
);

create unique index generation_quota_reservations_attempt_unique
on public.generation_quota_reservations (
  generated_material_id,
  reservation_started_at
)
where generated_material_id is not null;

create unique index generation_quota_reservations_active_material_unique
on public.generation_quota_reservations (
  generated_material_id
)
where
  generated_material_id is not null
  and state = 'reserved';

create index generation_quota_reservations_period_state_idx
on public.generation_quota_reservations (
  usage_period_id,
  state
);

create index generation_quota_reservations_owner_reserved_at_idx
on public.generation_quota_reservations (
  owner_id,
  reserved_at desc
);

create table public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),

  billing_provider text not null default 'stripe',
  provider_event_id text not null unique,
  event_type text not null,
  livemode boolean not null,

  status text not null default 'processing',
  error_message text null,

  received_at timestamptz not null default now(),
  processed_at timestamptz null,
  updated_at timestamptz not null default now(),

  constraint billing_webhook_events_provider_check
    check (billing_provider = 'stripe'),

  constraint billing_webhook_events_event_id_not_empty_check
    check (btrim(provider_event_id) <> ''),

  constraint billing_webhook_events_event_type_not_empty_check
    check (btrim(event_type) <> ''),

  constraint billing_webhook_events_status_check
    check (status in ('processing', 'processed', 'failed')),

  constraint billing_webhook_events_status_payload_check
    check (
      (
        status = 'processing'
        and processed_at is null
        and error_message is null
      )
      or
      (
        status = 'processed'
        and processed_at is not null
        and error_message is null
      )
      or
      (
        status = 'failed'
        and processed_at is not null
        and btrim(coalesce(error_message, '')) <> ''
      )
    )
);

create index billing_webhook_events_received_at_idx
on public.billing_webhook_events (
  received_at desc
);

-- Wszystkie nowe tabele są serwerowe. Frontend otrzyma później
-- wyłącznie oczyszczony status przez Route Handler.
alter table public.subscription_plans enable row level security;
alter table public.teacher_subscriptions enable row level security;
alter table public.internal_entitlements enable row level security;
alter table public.subscription_usage_periods enable row level security;
alter table public.generation_quota_reservations enable row level security;
alter table public.billing_webhook_events enable row level security;

revoke all on table public.subscription_plans
from public, anon, authenticated, service_role;

revoke all on table public.teacher_subscriptions
from public, anon, authenticated, service_role;

revoke all on table public.internal_entitlements
from public, anon, authenticated, service_role;

revoke all on table public.subscription_usage_periods
from public, anon, authenticated, service_role;

revoke all on table public.generation_quota_reservations
from public, anon, authenticated, service_role;

revoke all on table public.billing_webhook_events
from public, anon, authenticated, service_role;

grant usage on schema public to service_role;

grant select
on table public.subscription_plans
to service_role;

grant select, insert, update
on table public.teacher_subscriptions
to service_role;

grant select
on table public.internal_entitlements
to service_role;

grant select
on table public.subscription_usage_periods
to service_role;

grant select
on table public.generation_quota_reservations
to service_role;

grant select, insert, update
on table public.billing_webhook_events
to service_role;

create trigger subscription_plans_set_updated_at
before update on public.subscription_plans
for each row
execute function public.set_updated_at();

create trigger teacher_subscriptions_set_updated_at
before update on public.teacher_subscriptions
for each row
execute function public.set_updated_at();

create trigger internal_entitlements_set_updated_at
before update on public.internal_entitlements
for each row
execute function public.set_updated_at();

create trigger subscription_usage_periods_set_updated_at
before update on public.subscription_usage_periods
for each row
execute function public.set_updated_at();

create trigger billing_webhook_events_set_updated_at
before update on public.billing_webhook_events
for each row
execute function public.set_updated_at();

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
  is_active
)
values (
  'smartteacher_monthly_pln_v1',
  'SmartTeacher — plan miesięczny',
  'PLN',
  3900,
  'month',
  1,
  50,
  'stripe',
  null,
  true
);

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
select
  '5f066c58-e4c8-4228-b161-4d573da8655d'::uuid,
  sp.id,
  'project_owner',
  'active',
  '2026-08-09 00:00:00+00'::timestamptz,
  null,
  '2026-08-09 00:00:00+00'::timestamptz,
  'Zatwierdzone konto właścicielskie SmartTeacher.'
from public.subscription_plans sp
where sp.plan_key = 'smartteacher_monthly_pln_v1';

create or replace function public.claim_generated_material(
  p_owner_id uuid,
  p_subject_id uuid,
  p_lesson_topic_id uuid,
  p_source_document_id uuid,

  p_subject_name_snapshot text,
  p_topic_title_snapshot text,
  p_source_file_name_snapshot text,

  p_material_type text,
  p_task_count integer,
  p_profiles text[],
  p_task_plan jsonb,

  p_source_fingerprint text,
  p_source_manifest_version text,
  p_generation_fingerprint text,
  p_generator_version text,
  p_content_schema_version text,
  p_model text
)
returns table (
  claim_state text,
  generated_material_id uuid,
  material_status text,
  claim_content_json jsonb,
  claim_access_count integer,
  claim_started_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();

  v_plan public.subscription_plans%rowtype;
  v_subscription public.teacher_subscriptions%rowtype;
  v_entitlement public.internal_entitlements%rowtype;
  v_usage public.subscription_usage_periods%rowtype;

  v_record public.generated_materials%rowtype;
  v_reservation public.generation_quota_reservations%rowtype;
  v_previous_usage public.subscription_usage_periods%rowtype;

  v_period_start timestamptz;
  v_period_end timestamptz;
  v_period_months integer;
begin
  if p_owner_id is null then
    raise exception
      'Brak owner_id dla claim_generated_material.';
  end if;

  -- Wszystkie operacje limitu jednego właściciela mają wspólną
  -- blokadę transakcyjną, także na granicy okresów rozliczeniowych.
  perform pg_advisory_xact_lock(
    hashtextextended(p_owner_id::text, 0)
  );

  select ie.*
  into v_entitlement
  from public.internal_entitlements ie
  where ie.owner_id = p_owner_id
    and ie.status = 'active'
    and ie.starts_at <= v_now
    and (
      ie.ends_at is null
      or v_now < ie.ends_at
    )
  for update;

  if found then
    select sp.*
    into strict v_plan
    from public.subscription_plans sp
    where sp.id = v_entitlement.plan_id;

    v_period_months :=
      extract(
        year from age(v_now, v_entitlement.period_anchor)
      )::integer * 12
      + extract(
          month from age(v_now, v_entitlement.period_anchor)
        )::integer;

    v_period_start :=
      v_entitlement.period_anchor
      + make_interval(months => v_period_months);

    if v_period_start > v_now then
      v_period_months := v_period_months - 1;
      v_period_start :=
        v_entitlement.period_anchor
        + make_interval(months => v_period_months);
    end if;

    v_period_end :=
      v_entitlement.period_anchor
      + make_interval(months => v_period_months + 1);

    if v_now >= v_period_end then
      v_period_months := v_period_months + 1;
      v_period_start := v_period_end;
      v_period_end :=
        v_entitlement.period_anchor
        + make_interval(months => v_period_months + 1);
    end if;

    if
      v_entitlement.ends_at is not null
      and v_entitlement.ends_at < v_period_end
    then
      v_period_end := v_entitlement.ends_at;
    end if;

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
      null,
      v_entitlement.id,
      v_period_start,
      v_period_end,
      v_plan.generation_limit
    )
    on conflict do nothing;

    select sup.*
    into v_usage
    from public.subscription_usage_periods sup
    where sup.internal_entitlement_id = v_entitlement.id
      and sup.period_start = v_period_start
      and sup.period_end = v_period_end
    for update;
  else
    select ts.*
    into v_subscription
    from public.teacher_subscriptions ts
    where ts.owner_id = p_owner_id
      and ts.status = 'active'
      and ts.current_period_start <= v_now
      and v_now < ts.current_period_end
    for update;

    if not found then
      return query
      select
        'subscription_required'::text,
        null::uuid,
        null::text,
        null::jsonb,
        0::integer,
        null::timestamptz;

      return;
    end if;

    select sp.*
    into strict v_plan
    from public.subscription_plans sp
    where sp.id = v_subscription.plan_id;

    v_period_start := v_subscription.current_period_start;
    v_period_end := v_subscription.current_period_end;

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
      v_period_start,
      v_period_end,
      v_plan.generation_limit
    )
    on conflict do nothing;

    select sup.*
    into v_usage
    from public.subscription_usage_periods sup
    where sup.subscription_id = v_subscription.id
      and sup.period_start = v_period_start
      and sup.period_end = v_period_end
    for update;
  end if;

  if not found then
    raise exception
      'Nie udało się ustalić okresu użycia dla owner_id %.',
      p_owner_id;
  end if;

  select gm.*
  into v_record
  from public.generated_materials gm
  where gm.owner_id = p_owner_id
    and gm.generation_fingerprint = lower(
      btrim(p_generation_fingerprint)
    )
  for update;

  if found then
    if v_record.status = 'ready' then
      update public.generated_materials gm
      set
        access_count = gm.access_count + 1,
        last_accessed_at = v_now
      where gm.id = v_record.id
      returning *
      into v_record;

      return query
      select
        'hit'::text,
        v_record.id,
        v_record.status,
        v_record.content_json,
        v_record.access_count,
        v_record.started_at;

      return;
    end if;

    if
      v_record.status = 'generating'
      and v_record.started_at > v_now - interval '10 minutes'
    then
      return query
      select
        'in_progress'::text,
        v_record.id,
        v_record.status,
        null::jsonb,
        v_record.access_count,
        v_record.started_at;

      return;
    end if;

    if v_record.status not in ('failed', 'generating') then
      raise exception
        'Nieobsługiwany status cache Generatora: %.',
        v_record.status;
    end if;

    select gqr.*
    into v_reservation
    from public.generation_quota_reservations gqr
    where gqr.owner_id = p_owner_id
      and gqr.generated_material_id = v_record.id
      and gqr.state = 'reserved'
    for update;

    if found then
      select sup.*
      into v_previous_usage
      from public.subscription_usage_periods sup
      where sup.id = v_reservation.usage_period_id
        and sup.owner_id = p_owner_id
      for update;

      if not found or v_previous_usage.reserved_count < 1 then
        raise exception
          'Niespójna aktywna rezerwacja limitu dla materiału %.',
          v_record.id;
      end if;

      update public.subscription_usage_periods sup
      set reserved_count = sup.reserved_count - 1
      where sup.id = v_previous_usage.id;

      update public.generation_quota_reservations gqr
      set
        state = 'released',
        released_at = v_now,
        release_reason = case
          when v_record.status = 'generating'
            then 'stale_generation_retry'
          else 'failed_generation_retry_cleanup'
        end
      where gqr.id = v_reservation.id;

      if v_previous_usage.id = v_usage.id then
        select sup.*
        into v_usage
        from public.subscription_usage_periods sup
        where sup.id = v_usage.id;
      end if;
    end if;
  end if;

  if v_usage.used_count + v_usage.reserved_count >= v_usage.generation_limit then
    return query
    select
      'limit_exhausted'::text,
      null::uuid,
      null::text,
      null::jsonb,
      0::integer,
      null::timestamptz;

    return;
  end if;

  if v_record.id is null then
    insert into public.generated_materials (
      owner_id,
      subject_id,
      lesson_topic_id,
      source_document_id,
      subject_name_snapshot,
      topic_title_snapshot,
      source_file_name_snapshot,
      material_type,
      task_count,
      profiles,
      task_plan,
      source_fingerprint,
      source_manifest_version,
      generation_fingerprint,
      generator_version,
      content_schema_version,
      model,
      status,
      last_accessed_at,
      started_at
    )
    values (
      p_owner_id,
      p_subject_id,
      p_lesson_topic_id,
      p_source_document_id,
      btrim(p_subject_name_snapshot),
      btrim(p_topic_title_snapshot),
      btrim(p_source_file_name_snapshot),
      lower(btrim(p_material_type)),
      p_task_count,
      p_profiles,
      p_task_plan,
      lower(btrim(p_source_fingerprint)),
      btrim(p_source_manifest_version),
      lower(btrim(p_generation_fingerprint)),
      btrim(p_generator_version),
      btrim(p_content_schema_version),
      btrim(p_model),
      'generating',
      v_now,
      v_now
    )
    returning *
    into v_record;
  else
    update public.generated_materials gm
    set
      status = 'generating',
      content_json = null,
      error_message = null,
      prompt_tokens = null,
      completion_tokens = null,
      total_tokens = null,
      last_accessed_at = v_now,
      started_at = v_now,
      completed_at = null
    where gm.id = v_record.id
    returning *
    into v_record;
  end if;

  insert into public.generation_quota_reservations (
    owner_id,
    usage_period_id,
    generated_material_id,
    reservation_started_at,
    state,
    reserved_at
  )
  values (
    p_owner_id,
    v_usage.id,
    v_record.id,
    v_record.started_at,
    'reserved',
    v_now
  );

  update public.subscription_usage_periods sup
  set reserved_count = sup.reserved_count + 1
  where sup.id = v_usage.id;

  return query
  select
    'reserved'::text,
    v_record.id,
    v_record.status,
    null::jsonb,
    v_record.access_count,
    v_record.started_at;
end;
$$;

comment on function public.claim_generated_material(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  integer,
  text[],
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text
) is
  'Atomowo sprawdza uprawnienie, zwraca cache HIT albo rezerwuje jedną jednostkę limitu dla cache MISS.';

revoke all
on function public.claim_generated_material(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  integer,
  text[],
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.claim_generated_material(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  integer,
  text[],
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text
)
to service_role;

create function public.finalize_generated_material_success(
  p_owner_id uuid,
  p_generated_material_id uuid,
  p_reservation_started_at timestamptz,
  p_content_json jsonb,
  p_prompt_tokens integer,
  p_completion_tokens integer,
  p_total_tokens integer
)
returns table (
  generated_material_id uuid,
  material_status text,
  result_content_json jsonb,
  result_access_count integer,
  result_started_at timestamptz,
  result_completed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_record public.generated_materials%rowtype;
  v_reservation public.generation_quota_reservations%rowtype;
  v_usage public.subscription_usage_periods%rowtype;
begin
  if
    p_owner_id is null
    or p_generated_material_id is null
    or p_reservation_started_at is null
    or p_content_json is null
    or jsonb_typeof(p_content_json) <> 'object'
    or p_prompt_tokens is null
    or p_prompt_tokens < 0
    or p_completion_tokens is null
    or p_completion_tokens < 0
    or p_total_tokens is null
    or p_total_tokens <> p_prompt_tokens + p_completion_tokens
  then
    raise exception
      'Nieprawidłowy wynik Generatora przekazany do finalizacji.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_owner_id::text, 0)
  );

  select gqr.*
  into v_reservation
  from public.generation_quota_reservations gqr
  where gqr.owner_id = p_owner_id
    and gqr.generated_material_id = p_generated_material_id
    and gqr.reservation_started_at = p_reservation_started_at
    and gqr.state = 'reserved'
  for update;

  if not found then
    raise exception
      'Brak aktywnej rezerwacji limitu dla gotowego materiału %.',
      p_generated_material_id;
  end if;

  select sup.*
  into v_usage
  from public.subscription_usage_periods sup
  where sup.id = v_reservation.usage_period_id
    and sup.owner_id = p_owner_id
  for update;

  if not found or v_usage.reserved_count < 1 then
    raise exception
      'Niespójny licznik rezerwacji dla gotowego materiału %.',
      p_generated_material_id;
  end if;

  select gm.*
  into v_record
  from public.generated_materials gm
  where gm.id = p_generated_material_id
    and gm.owner_id = p_owner_id
    and gm.status = 'generating'
    and gm.started_at = p_reservation_started_at
  for update;

  if not found then
    raise exception
      'Rezerwacja cache wygasła przed zapisaniem gotowego materiału.';
  end if;

  update public.subscription_usage_periods sup
  set
    reserved_count = sup.reserved_count - 1,
    used_count = sup.used_count + 1
  where sup.id = v_usage.id;

  update public.generation_quota_reservations gqr
  set
    state = 'consumed',
    consumed_at = v_now
  where gqr.id = v_reservation.id;

  update public.generated_materials gm
  set
    status = 'ready',
    content_json = p_content_json,
    error_message = null,
    prompt_tokens = p_prompt_tokens,
    completion_tokens = p_completion_tokens,
    total_tokens = p_total_tokens,
    last_accessed_at = v_now,
    completed_at = v_now
  where gm.id = v_record.id
  returning *
  into v_record;

  return query
  select
    v_record.id,
    v_record.status,
    v_record.content_json,
    v_record.access_count,
    v_record.started_at,
    v_record.completed_at;
end;
$$;

comment on function public.finalize_generated_material_success(
  uuid,
  uuid,
  timestamptz,
  jsonb,
  integer,
  integer,
  integer
) is
  'Atomowo zapisuje gotowy materiał i zamienia rezerwację limitu w wykorzystaną jednostkę.';

revoke all
on function public.finalize_generated_material_success(
  uuid,
  uuid,
  timestamptz,
  jsonb,
  integer,
  integer,
  integer
)
from public, anon, authenticated;

grant execute
on function public.finalize_generated_material_success(
  uuid,
  uuid,
  timestamptz,
  jsonb,
  integer,
  integer,
  integer
)
to service_role;

create function public.finalize_generated_material_failure(
  p_owner_id uuid,
  p_generated_material_id uuid,
  p_reservation_started_at timestamptz,
  p_error_message text
)
returns table (
  generated_material_id uuid,
  material_status text,
  result_error_message text,
  result_completed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_error_message text;
  v_record public.generated_materials%rowtype;
  v_reservation public.generation_quota_reservations%rowtype;
  v_usage public.subscription_usage_periods%rowtype;
begin
  if
    p_owner_id is null
    or p_generated_material_id is null
    or p_reservation_started_at is null
  then
    raise exception
      'Brak identyfikatora rezerwacji przekazanej do finalizacji błędu.';
  end if;

  v_error_message := left(
    coalesce(
      nullif(btrim(p_error_message), ''),
      'Nieznany błąd Generatora.'
    ),
    4000
  );

  perform pg_advisory_xact_lock(
    hashtextextended(p_owner_id::text, 0)
  );

  select gqr.*
  into v_reservation
  from public.generation_quota_reservations gqr
  where gqr.owner_id = p_owner_id
    and gqr.generated_material_id = p_generated_material_id
    and gqr.reservation_started_at = p_reservation_started_at
    and gqr.state = 'reserved'
  for update;

  if not found then
    raise exception
      'Brak aktywnej rezerwacji limitu dla błędu materiału %.',
      p_generated_material_id;
  end if;

  select sup.*
  into v_usage
  from public.subscription_usage_periods sup
  where sup.id = v_reservation.usage_period_id
    and sup.owner_id = p_owner_id
  for update;

  if not found or v_usage.reserved_count < 1 then
    raise exception
      'Niespójny licznik rezerwacji dla błędu materiału %.',
      p_generated_material_id;
  end if;

  select gm.*
  into v_record
  from public.generated_materials gm
  where gm.id = p_generated_material_id
    and gm.owner_id = p_owner_id
    and gm.status = 'generating'
    and gm.started_at = p_reservation_started_at
  for update;

  if not found then
    raise exception
      'Rezerwacja cache wygasła przed zapisaniem błędu materiału.';
  end if;

  update public.subscription_usage_periods sup
  set reserved_count = sup.reserved_count - 1
  where sup.id = v_usage.id;

  update public.generation_quota_reservations gqr
  set
    state = 'released',
    released_at = v_now,
    release_reason = 'generation_failed'
  where gqr.id = v_reservation.id;

  update public.generated_materials gm
  set
    status = 'failed',
    content_json = null,
    error_message = v_error_message,
    prompt_tokens = null,
    completion_tokens = null,
    total_tokens = null,
    completed_at = v_now
  where gm.id = v_record.id
  returning *
  into v_record;

  return query
  select
    v_record.id,
    v_record.status,
    v_record.error_message,
    v_record.completed_at;
end;
$$;

comment on function public.finalize_generated_material_failure(
  uuid,
  uuid,
  timestamptz,
  text
) is
  'Atomowo zapisuje błąd materiału i zwalnia wcześniejszą rezerwację limitu.';

revoke all
on function public.finalize_generated_material_failure(
  uuid,
  uuid,
  timestamptz,
  text
)
from public, anon, authenticated;

grant execute
on function public.finalize_generated_material_failure(
  uuid,
  uuid,
  timestamptz,
  text
)
to service_role;

commit;

-- Kontrola po migracji. Zapytania są odczytowe.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'subscription_plans',
    'teacher_subscriptions',
    'internal_entitlements',
    'subscription_usage_periods',
    'generation_quota_reservations',
    'billing_webhook_events'
  )
order by c.relname;

select
  g.table_name,
  g.grantee,
  g.privilege_type
from information_schema.role_table_grants g
where g.table_schema = 'public'
  and g.table_name in (
    'subscription_plans',
    'teacher_subscriptions',
    'internal_entitlements',
    'subscription_usage_periods',
    'generation_quota_reservations',
    'billing_webhook_events'
  )
  and g.grantee in (
    'anon',
    'authenticated',
    'service_role'
  )
order by g.table_name, g.grantee, g.privilege_type;

select
  p.oid::regprocedure::text as function_identity,
  p.prosecdef as security_definer,
  has_function_privilege('public', p.oid, 'execute') as execute_public,
  has_function_privilege('anon', p.oid, 'execute') as execute_anon,
  has_function_privilege('authenticated', p.oid, 'execute') as execute_authenticated,
  has_function_privilege('service_role', p.oid, 'execute') as execute_service_role
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'claim_generated_material',
    'finalize_generated_material_success',
    'finalize_generated_material_failure'
  )
order by function_identity;

select
  sp.plan_key,
  sp.currency,
  sp.price_gross_minor,
  sp.billing_interval,
  sp.generation_limit,
  sp.billing_provider,
  sp.provider_price_id,
  sp.is_active
from public.subscription_plans sp;

select
  ie.owner_id,
  ie.entitlement_type,
  ie.status,
  ie.starts_at,
  ie.ends_at,
  ie.period_anchor
from public.internal_entitlements ie;
