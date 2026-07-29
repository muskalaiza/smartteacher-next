-- SmartTeacher Next
-- Atomowa rezerwacja i odczyt cache Generatora.
-- Projekt: smartteacher-next
-- Supabase: smartteacher-next-dev
-- Data: 2026-07-29

begin;

drop function if exists public.claim_generated_material(
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
);

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
  v_record public.generated_materials%rowtype;
  v_now timestamptz;
begin
  /*
    Próba utworzenia nowej rezerwacji.

    Unikalność:
    owner_id + generation_fingerprint

    powoduje, że tylko jedno równoległe
    żądanie może utworzyć rekord generating.
  */
  v_now := clock_timestamp();

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
  on conflict (
    owner_id,
    generation_fingerprint
  )
  do nothing
  returning *
  into v_record;

  if found then
    return query
    select
      'reserved'::text,
      v_record.id,
      v_record.status,
      null::jsonb,
      v_record.access_count,
      v_record.started_at;

    return;
  end if;

  /*
    Rekord już istnieje.

    Blokada wiersza zapewnia atomową decyzję:
    hit / in_progress / ponowna rezerwacja.
  */
  v_now := clock_timestamp();

  select *
  into v_record
  from public.generated_materials
  where owner_id =
      p_owner_id
    and generation_fingerprint =
      lower(
        btrim(
          p_generation_fingerprint
        )
      )
  for update;

  if not found then
    raise exception
      'Rekord cache zniknął podczas rezerwacji.';
  end if;

  /*
    Cache HIT.

    Zwiększenie access_count odbywa się
    pod blokadą tego samego wiersza,
    więc równoległe odczyty nie tracą inkrementacji.
  */
  if v_record.status = 'ready' then
    update public.generated_materials as gm
    set
      access_count =
        access_count + 1,

      last_accessed_at =
        v_now
    where id =
      v_record.id
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

  /*
    Aktywne generowanie.

    10 minut przekracza maksymalny oczekiwany czas
    wywołania Generatora wraz z retry i zapisem wyniku.
  */
  if
    v_record.status = 'generating'
    and v_record.started_at >
      v_now - interval '10 minutes'
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

  /*
    Rekord failed albo porzucone generating
    może zostać ponownie zarezerwowane.

    access_count pozostaje bez zmiany,
    ponieważ nie powstało jeszcze kolejne
    skuteczne użycie gotowego materiału.
  */
  if v_record.status not in (
    'failed',
    'generating'
  ) then
    raise exception
      'Nieobsługiwany status cache Generatora: %.',
      v_record.status;
  end if;

  update public.generated_materials
  set
    status =
      'generating',

    content_json =
      null,

    error_message =
      null,

    prompt_tokens =
      null,

    completion_tokens =
      null,

    total_tokens =
      null,

    last_accessed_at =
      v_now,

    started_at =
      v_now,

    completed_at =
      null
  where id =
    v_record.id
  returning *
  into v_record;

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
  'Atomowo rezerwuje generowanie albo zwraca gotowy materiał z cache.';

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

commit;

-- Kontrola wdrożenia funkcji.

select
  p.proname as function_name,
  pg_get_function_identity_arguments(
    p.oid
  ) as arguments,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname =
    'claim_generated_material';

select
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name =
    'claim_generated_material'
order by
  grantee,
  privilege_type;