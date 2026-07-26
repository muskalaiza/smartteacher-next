-- SmartTeacher Next
-- Zmiana 1/2: rozszerzenie teacher_documents o tożsamość treści źródłowej.
-- Projekt: smartteacher-next / Supabase: smartteacher-next-dev
-- Data: 2026-07-26
--
-- Ta migracja NIE oblicza fingerprintów dla istniejących dokumentów.
-- Dodaje wyłącznie miejsce na wartości, które zapisze później
-- serwerowy pipeline po deterministycznym chunkingu.

begin;

alter table public.teacher_documents
  add column if not exists source_fingerprint text null,
  add column if not exists source_manifest_version text null,
  add column if not exists ready_at timestamptz null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_documents_source_fingerprint_format_check'
      and conrelid = 'public.teacher_documents'::regclass
  ) then
    alter table public.teacher_documents
      add constraint teacher_documents_source_fingerprint_format_check
      check (
        source_fingerprint is null
        or source_fingerprint ~ '^[0-9a-f]{64}$'
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_documents_source_manifest_version_check'
      and conrelid = 'public.teacher_documents'::regclass
  ) then
    alter table public.teacher_documents
      add constraint teacher_documents_source_manifest_version_check
      check (
        source_manifest_version is null
        or btrim(source_manifest_version) <> ''
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_documents_source_identity_consistency_check'
      and conrelid = 'public.teacher_documents'::regclass
  ) then
    alter table public.teacher_documents
      add constraint teacher_documents_source_identity_consistency_check
      check (
        (
          source_fingerprint is null
          and source_manifest_version is null
        )
        or
        (
          source_fingerprint is not null
          and source_manifest_version is not null
        )
      );
  end if;
end $$;

comment on column public.teacher_documents.source_fingerprint is
  'SHA-256 kanonicznego manifestu pełnej treści źródłowej po chunkingu.';

comment on column public.teacher_documents.source_manifest_version is
  'Wersja kontraktu użytego do zbudowania source_fingerprint, np. document_chunks_v1.';

comment on column public.teacher_documents.ready_at is
  'Moment, w którym dokument uzyskał kompletną tożsamość źródła i jest gotowy dla Generatora.';

commit;

-- Kontrola po migracji:
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'teacher_documents'
  and column_name in (
    'source_fingerprint',
    'source_manifest_version',
    'ready_at'
  )
order by ordinal_position;
