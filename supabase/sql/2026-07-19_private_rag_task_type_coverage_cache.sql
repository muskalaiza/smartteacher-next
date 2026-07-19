begin;

create table if not exists public.private_rag_task_type_coverage_cache (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    references auth.users(id)
    on delete cascade,

  subject_id uuid not null
    references public.subjects(id)
    on delete cascade,

  lesson_topic_id uuid not null
    references public.lesson_topics(id)
    on delete cascade,

  /*
    SHA-256 obliczony w kodzie serwerowym z:
    - zapytania retrieval,
    - kolejności źródeł,
    - chunkId,
    - contentHash.
  */
  source_fingerprint text not null,

  /*
    Zwiększamy wersję po zmianie:
    - promptu coverage,
    - JSON Schema coverage,
    - walidacji,
    - zasad oceny.
  */
  coverage_version text not null,

  evaluation_model text not null,

  retrieval_query text not null,

  /*
    Tylko lekkie referencje:
    rank, chunkId, contentHash.
    Nie zapisujemy ponownie pełnej treści chunków.
  */
  source_refs jsonb not null,

  source_count integer not null,

  /*
    Obiekt:
    assessments[taskSubtype]
  */
  assessments jsonb not null,

  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint private_rag_coverage_fingerprint_format
    check (
      source_fingerprint ~ '^[0-9a-f]{64}$'
    ),

  constraint private_rag_coverage_version_not_empty
    check (
      length(trim(coverage_version)) > 0
    ),

  constraint private_rag_coverage_model_not_empty
    check (
      length(trim(evaluation_model)) > 0
    ),

  constraint private_rag_coverage_query_not_empty
    check (
      length(trim(retrieval_query)) > 0
    ),

  constraint private_rag_coverage_source_refs_array
    check (
      jsonb_typeof(source_refs) = 'array'
    ),

  constraint private_rag_coverage_source_count_positive
    check (
      source_count > 0
    ),

  constraint private_rag_coverage_source_count_matches
    check (
      jsonb_array_length(source_refs) =
      source_count
    ),

  constraint private_rag_coverage_assessments_object
    check (
      jsonb_typeof(assessments) = 'object'
    ),

  constraint private_rag_coverage_prompt_tokens_nonnegative
    check (
      prompt_tokens is null or
      prompt_tokens >= 0
    ),

  constraint private_rag_coverage_completion_tokens_nonnegative
    check (
      completion_tokens is null or
      completion_tokens >= 0
    ),

  constraint private_rag_coverage_total_tokens_nonnegative
    check (
      total_tokens is null or
      total_tokens >= 0
    ),

  constraint private_rag_coverage_unique_context
    unique (
      owner_id,
      subject_id,
      lesson_topic_id,
      source_fingerprint,
      coverage_version,
      evaluation_model
    )
);

comment on table
  public.private_rag_task_type_coverage_cache
is
  'Cache oceny pokrycia siedmiu typów zadań dla konkretnego zestawu prywatnych źródeł nauczyciela.';

alter table
  public.private_rag_task_type_coverage_cache
enable row level security;

revoke all
  on table public.private_rag_task_type_coverage_cache
  from anon, authenticated;

grant select, insert, update, delete
  on table public.private_rag_task_type_coverage_cache
  to service_role;

commit;