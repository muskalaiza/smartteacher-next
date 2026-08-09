-- SmartTeacher Next
-- Rejestr rzeczywistych wywołań OpenAI.
-- Projekt: smartteacher-next / Supabase: smartteacher-next-dev
-- Data: 2026-08-06
--
-- Zakres:
-- - jedno zdarzenie dla jednego logicznego wywołania OpenAI,
-- - generowanie materiałów i embeddingi dokumentów,
-- - zachowanie dostępnych danych usage także po błędzie walidacji lub parsera,
-- - wyłącznie dostęp serwerowy przez service_role.
--
-- Poza zakresem:
-- - cenniki i wyliczanie kosztu,
-- - panel kosztów,
-- - dane rozliczeniowe Supabase i Vercel,
-- - backfill historycznych rekordów generated_materials.

begin;

create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    references auth.users(id) on delete cascade,

  generated_material_id uuid null
    references public.generated_materials(id) on delete set null,

  source_document_id uuid null
    references public.teacher_documents(id) on delete set null,

  operation text not null,
  model text not null,
  status text not null,

  usage_known boolean not null,
  input_tokens integer null,
  cached_input_tokens integer null,
  output_tokens integer null,
  total_tokens integer null,

  created_at timestamptz not null default now(),

  constraint ai_usage_events_operation_check
    check (
      operation in (
        'material_generation',
        'document_embedding'
      )
    ),

  constraint ai_usage_events_status_check
    check (status in ('succeeded', 'failed')),

  constraint ai_usage_events_model_not_empty_check
    check (btrim(model) <> ''),

  constraint ai_usage_events_relation_check
    check (
      (
        operation = 'material_generation'
        and source_document_id is null
      )
      or
      (
        operation = 'document_embedding'
        and generated_material_id is null
      )
    ),

  constraint ai_usage_events_token_values_check
    check (
      (input_tokens is null or input_tokens >= 0)
      and (
        cached_input_tokens is null
        or (
          input_tokens is not null
          and cached_input_tokens between 0 and input_tokens
        )
      )
      and (output_tokens is null or output_tokens >= 0)
      and (total_tokens is null or total_tokens >= 0)
    ),

  constraint ai_usage_events_operation_usage_check
    check (
      operation = 'material_generation'
      or (
        cached_input_tokens is null
        and output_tokens is null
      )
    ),

  constraint ai_usage_events_known_usage_check
    check (
      not usage_known
      or
      case operation
        when 'material_generation' then
          input_tokens is not null
          and output_tokens is not null
          and total_tokens is not null
          and total_tokens = input_tokens + output_tokens

        when 'document_embedding' then
          input_tokens is not null
          and total_tokens is not null
          and total_tokens = input_tokens

        else false
      end
    )
);

comment on table public.ai_usage_events is
  'Append-only rejestr logicznych wywołań OpenAI dla monitoringu użycia i przyszłych estymacji kosztu.';

comment on column public.ai_usage_events.usage_known is
  'True wyłącznie wtedy, gdy dostawca zwrócił kompletny i spójny zestaw tokenów wymagany dla danej operacji.';

comment on column public.ai_usage_events.cached_input_tokens is
  'Liczba tokenów wejściowych odczytanych z cache dostawcy; NULL, gdy pole nie zostało zwrócone lub nie dotyczy operacji.';

comment on column public.ai_usage_events.generated_material_id is
  'Powiązanie z próbą Generatora; może stać się NULL po usunięciu materiału, bez utraty zdarzenia kosztowego.';

comment on column public.ai_usage_events.source_document_id is
  'Powiązanie z dokumentem źródłowym embeddingów; może stać się NULL po usunięciu dokumentu.';

create index ai_usage_events_created_at_idx
on public.ai_usage_events (
  created_at desc
);

create index ai_usage_events_owner_created_at_idx
on public.ai_usage_events (
  owner_id,
  created_at desc
);

create index ai_usage_events_generated_material_idx
on public.ai_usage_events (
  generated_material_id
)
where generated_material_id is not null;

create index ai_usage_events_source_document_idx
on public.ai_usage_events (
  source_document_id
)
where source_document_id is not null;

alter table public.ai_usage_events
enable row level security;

revoke all
on table public.ai_usage_events
from public, anon, authenticated, service_role;

grant usage
on schema public
to service_role;

grant select, insert
on table public.ai_usage_events
to service_role;

-- Brak polityk dla anon i authenticated jest celowy.
-- Frontend nie odczytuje ani nie zapisuje rejestru użycia.

commit;

-- Kontrola po migracji:
select
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'ai_usage_events'
order by c.ordinal_position;

select
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
where con.conrelid = 'public.ai_usage_events'::regclass
order by con.conname;

select
  i.indexname,
  i.indexdef
from pg_indexes i
where i.schemaname = 'public'
  and i.tablename = 'ai_usage_events'
order by i.indexname;

select
  cl.relrowsecurity as rls_enabled,
  cl.relforcerowsecurity as rls_forced
from pg_class cl
join pg_namespace ns
  on ns.oid = cl.relnamespace
where ns.nspname = 'public'
  and cl.relname = 'ai_usage_events';

select
  p.policyname,
  p.cmd,
  p.roles,
  p.qual,
  p.with_check
from pg_policies p
where p.schemaname = 'public'
  and p.tablename = 'ai_usage_events'
order by p.policyname;

select
  g.grantee,
  g.privilege_type
from information_schema.role_table_grants g
where g.table_schema = 'public'
  and g.table_name = 'ai_usage_events'
  and g.grantee in (
    'anon',
    'authenticated',
    'service_role'
  )
order by g.grantee, g.privilege_type;
