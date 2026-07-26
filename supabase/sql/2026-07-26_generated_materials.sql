-- SmartTeacher Next
-- Zmiana 2/2: gotowe materiały jako cache oraz źródło Historii Generowań.
-- Projekt: smartteacher-next / Supabase: smartteacher-next-dev
-- Data: 2026-07-26
--
-- Jeden rekord oznacza jeden unikalny materiał nauczyciela.
-- Cache jest identyfikowany przez (owner_id, generation_fingerprint).
-- Dozwolona liczba zadań: dokładnie 5, 6 albo 7.

begin;

create table public.generated_materials (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    references auth.users(id) on delete cascade,

  subject_id uuid not null
    references public.subjects(id) on delete restrict,

  lesson_topic_id uuid null
    references public.lesson_topics(id) on delete set null,

  source_document_id uuid null
    references public.teacher_documents(id) on delete set null,

  subject_name_snapshot text not null,
  topic_title_snapshot text not null,
  source_file_name_snapshot text not null,

  material_type text not null,
  task_count smallint not null,
  profiles text[] not null,
  task_plan jsonb not null,

  source_fingerprint text not null,
  source_manifest_version text not null,
  generation_fingerprint text not null,
  generator_version text not null,
  content_schema_version text not null,
  model text not null,

  status text not null default 'generating',
  content_json jsonb null,
  error_message text null,

  prompt_tokens integer null,
  completion_tokens integer null,
  total_tokens integer null,

  access_count integer not null default 1,
  last_accessed_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint generated_materials_owner_generation_fingerprint_unique
    unique (owner_id, generation_fingerprint),

  constraint generated_materials_material_type_check
    check (material_type in ('karta pracy', 'kartkówka', 'sprawdzian')),

  constraint generated_materials_task_count_check
    check (task_count in (5, 6, 7)),

  constraint generated_materials_profiles_check
    check (
      cardinality(profiles) between 1 and 5
      and profiles <@ array[
        'Standard',
        'Dysleksja',
        'ASD',
        'ADHD',
        'Obcojęzyczny'
      ]::text[]
    ),

  constraint generated_materials_task_plan_type_check
    check (jsonb_typeof(task_plan) = 'array'),

  constraint generated_materials_task_plan_count_check
    check (
      case
        when jsonb_typeof(task_plan) = 'array'
          then jsonb_array_length(task_plan) = task_count
        else false
      end
    ),

  constraint generated_materials_source_fingerprint_format_check
    check (source_fingerprint ~ '^[0-9a-f]{64}$'),

  constraint generated_materials_generation_fingerprint_format_check
    check (generation_fingerprint ~ '^[0-9a-f]{64}$'),

  constraint generated_materials_nonempty_versions_check
    check (
      btrim(source_manifest_version) <> ''
      and btrim(generator_version) <> ''
      and btrim(content_schema_version) <> ''
      and btrim(model) <> ''
    ),

  constraint generated_materials_nonempty_snapshots_check
    check (
      btrim(subject_name_snapshot) <> ''
      and btrim(topic_title_snapshot) <> ''
      and btrim(source_file_name_snapshot) <> ''
    ),

  constraint generated_materials_status_check
    check (status in ('generating', 'ready', 'failed')),

  constraint generated_materials_content_json_check
    check (
      content_json is null
      or jsonb_typeof(content_json) = 'object'
    ),

  constraint generated_materials_usage_check
    check (
      (
        prompt_tokens is null
        and completion_tokens is null
        and total_tokens is null
      )
      or
      (
        prompt_tokens >= 0
        and completion_tokens >= 0
        and total_tokens = prompt_tokens + completion_tokens
      )
    ),

  constraint generated_materials_access_count_check
    check (access_count >= 1),

  constraint generated_materials_status_payload_consistency_check
    check (
      (
        status = 'generating'
        and content_json is null
        and error_message is null
        and completed_at is null
      )
      or
      (
        status = 'ready'
        and content_json is not null
        and error_message is null
        and completed_at is not null
      )
      or
      (
        status = 'failed'
        and content_json is null
        and btrim(coalesce(error_message, '')) <> ''
        and completed_at is not null
      )
    )
);

comment on table public.generated_materials is
  'Kanoniczne wyniki Generatora SmartTeacher; jednocześnie cache i źródło Historii Generowań.';

comment on column public.generated_materials.generation_fingerprint is
  'SHA-256 źródła, parametrów generowania, taskPlan, wersji Generatora i modelu.';

comment on column public.generated_materials.content_json is
  'Wynik po Structured Outputs i parserze; bez surowej odpowiedzi modelu i bez HTML.';

comment on column public.generated_materials.access_count is
  'Liczba użyć tego samego gotowego materiału, łącznie z pierwszym generowaniem.';

create index generated_materials_owner_subject_history_idx
on public.generated_materials (
  owner_id,
  subject_id,
  last_accessed_at desc
)
where status = 'ready';

create index generated_materials_owner_topic_history_idx
on public.generated_materials (
  owner_id,
  lesson_topic_id,
  last_accessed_at desc
)
where status = 'ready';

alter table public.generated_materials enable row level security;

grant usage on schema public to authenticated, service_role;

revoke all on table public.generated_materials from anon;
revoke all on table public.generated_materials from authenticated;

grant select
on table public.generated_materials
 to authenticated;

grant select, insert, update, delete
on table public.generated_materials
 to service_role;

create policy generated_materials_select_own
on public.generated_materials
for select
to authenticated
using (owner_id = auth.uid());

drop trigger if exists generated_materials_set_updated_at
on public.generated_materials;

create trigger generated_materials_set_updated_at
before update on public.generated_materials
for each row
execute function public.set_updated_at();

commit;

-- Kontrola po migracji:
select
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'generated_materials'
order by c.ordinal_position;

select
  conname as constraint_name,
  pg_get_constraintdef(oid, true) as definition
from pg_constraint
where conrelid = 'public.generated_materials'::regclass
order by conname;

select
  policyname,
  cmd,
  roles,
  qual
from pg_policies
where schemaname = 'public'
  and tablename = 'generated_materials'
order by policyname;
