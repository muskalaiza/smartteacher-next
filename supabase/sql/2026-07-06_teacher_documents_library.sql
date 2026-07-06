-- SmartTeacher Next
-- Minimalna Biblioteka materiałów źródłowych nauczyciela
-- Data: 2026-07-06
-- Projekt: smartteacher-next / Supabase: smartteacher-next-dev
--
-- Zakres:
-- - prywatny bucket Storage: teacher-documents
-- - tabela public.teacher_documents
-- - przypisanie dokumentu do właściciela i aktywnego przedmiotu
-- - RLS dla teacher_documents
-- - polityki Storage dla ścieżek zaczynających się od auth.uid()
-- - GRANT dla roli authenticated
--
-- Poza zakresem tej migracji:
-- - parsowanie CSV do lesson_plan_imports / lesson_plan_items
-- - extraction DOCX
-- - document_blocks
-- - document_chunks
-- - embeddings
-- - retrieval
-- - integracja z Generatorem

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Storage bucket na prywatne dokumenty nauczyciela
-- -----------------------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'teacher-documents',
  'teacher-documents',
  false,
  10485760,
  array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'application/csv',
    'text/plain'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 2. Metadane plików źródłowych nauczyciela
-- -----------------------------------------------------------------------------

create table if not exists public.teacher_documents (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  lesson_topic_id uuid null references public.lesson_topics(id) on delete set null,

  source_type text not null default 'teacher_private'
    check (source_type = 'teacher_private'),

  storage_bucket text not null default 'teacher-documents',
  storage_path text not null,

  original_file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes >= 0),

  status text not null default 'uploaded'
    check (status in ('uploaded', 'extracted', 'chunked', 'embedded', 'ready', 'error')),

  error_message text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint teacher_documents_owner_storage_path_unique
    unique (owner_id, storage_path)
);

-- Jeżeli tabela została utworzona wcześniej ręcznie bez subject_id,
-- dokładamy kolumnę i backfillujemy stare testowe rekordy do Informatyki.

alter table public.teacher_documents
add column if not exists subject_id uuid null
references public.subjects(id) on delete restrict;

update public.teacher_documents
set subject_id = (
  select id
  from public.subjects
  where subject_key = 'informatyka'
  limit 1
)
where subject_id is null
  and exists (
    select 1
    from public.subjects
    where subject_key = 'informatyka'
  );

do $$
begin
  if exists (
    select 1
    from public.teacher_documents
    where subject_id is null
  ) then
    raise exception 'teacher_documents.subject_id contains NULL values. Assign subject_id before setting NOT NULL.';
  end if;
end $$;

alter table public.teacher_documents
alter column subject_id set not null;

-- Unikalność ścieżki pliku w ramach konta nauczyciela.
-- create table if not exists nie dodaje constraintów do istniejącej tabeli,
-- dlatego zabezpieczamy ręcznie starszy wariant schematu.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_documents_owner_storage_path_unique'
      and conrelid = 'public.teacher_documents'::regclass
  ) then
    alter table public.teacher_documents
    add constraint teacher_documents_owner_storage_path_unique
    unique (owner_id, storage_path);
  end if;
end $$;

create index if not exists teacher_documents_owner_created_idx
on public.teacher_documents (owner_id, created_at desc);

create index if not exists teacher_documents_owner_lesson_topic_idx
on public.teacher_documents (owner_id, lesson_topic_id);

create index if not exists teacher_documents_owner_subject_created_idx
on public.teacher_documents (owner_id, subject_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 3. Uprawnienia SQL
-- -----------------------------------------------------------------------------

alter table public.teacher_documents enable row level security;

grant usage on schema public to authenticated;

grant select, insert, update, delete
on table public.teacher_documents
to authenticated;

-- -----------------------------------------------------------------------------
-- 4. RLS dla public.teacher_documents
-- -----------------------------------------------------------------------------

-- Nauczyciel widzi i modyfikuje tylko własne metadane dokumentów.
-- Separację po przedmiocie egzekwuje aplikacja przez subject_id.
-- Separację między nauczycielami egzekwuje RLS przez owner_id = auth.uid().

drop policy if exists "teacher_documents_select_own" on public.teacher_documents;
create policy "teacher_documents_select_own"
on public.teacher_documents
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "teacher_documents_insert_own" on public.teacher_documents;
create policy "teacher_documents_insert_own"
on public.teacher_documents
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "teacher_documents_update_own" on public.teacher_documents;
create policy "teacher_documents_update_own"
on public.teacher_documents
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "teacher_documents_delete_own" on public.teacher_documents;
create policy "teacher_documents_delete_own"
on public.teacher_documents
for delete
to authenticated
using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. Polityki Storage dla bucketa teacher-documents
-- -----------------------------------------------------------------------------

-- Wymagany format ścieżki pliku:
-- teacher-documents/<auth.uid()>/<timestamp>-<safe_file_name>
--
-- Aplikacja zapisuje storage_path bez nazwy bucketa, np.:
-- <auth.uid()>/1783347851284-zmienne_CPP.docx

alter table storage.objects enable row level security;

drop policy if exists "teacher_documents_storage_select_own" on storage.objects;
create policy "teacher_documents_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'teacher-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "teacher_documents_storage_insert_own" on storage.objects;
create policy "teacher_documents_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'teacher-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "teacher_documents_storage_update_own" on storage.objects;
create policy "teacher_documents_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'teacher-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'teacher-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "teacher_documents_storage_delete_own" on storage.objects;
create policy "teacher_documents_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'teacher-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- -----------------------------------------------------------------------------
-- 6. Kontrola po migracji
-- -----------------------------------------------------------------------------

-- select
--   table_name
-- from information_schema.tables
-- where table_schema = 'public'
--   and table_name = 'teacher_documents';
--
-- select
--   column_name,
--   data_type,
--   is_nullable
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'teacher_documents'
-- order by ordinal_position;
--
-- select
--   id,
--   name,
--   public,
--   file_size_limit,
--   allowed_mime_types
-- from storage.buckets
-- where id = 'teacher-documents';
--
-- select
--   td.original_file_name,
--   s.subject_key,
--   td.status,
--   td.storage_bucket,
--   td.storage_path,
--   td.created_at
-- from public.teacher_documents td
-- join public.subjects s
--   on s.id = td.subject_id
-- order by td.created_at desc;
