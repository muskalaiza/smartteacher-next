-- SmartTeacher Next
-- Source-only DOCX ingestion: document_chunks
-- Data: 2026-07-11
-- Projekt: smartteacher-next / Supabase: smartteacher-next-dev
--
-- Zakres:
-- - tabela public.document_chunks
-- - trwałe powiązanie chunka z dokumentem i właścicielem
-- - dokładne indeksy bloków źródłowych
-- - metadane algorytmu chunkingu
-- - kontrola integralności
-- - RLS: nauczyciel widzi wyłącznie własne chunki
--
-- Poza zakresem:
-- - zapis chunków z aplikacji
-- - aktualizacja teacher_documents.status
-- - embeddingi
-- - pgvector
-- - retrieval
-- - integracja z Generatorem

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Integralność relacji dokument + właściciel
-- -----------------------------------------------------------------------------

-- Constraint powinien już istnieć po migracji document_blocks.
-- Zabezpieczenie pozwala uruchomić tę migrację także na bazie,
-- w której tabela teacher_documents powstała wcześniej.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teacher_documents_id_owner_unique'
      and conrelid = 'public.teacher_documents'::regclass
  ) then
    alter table public.teacher_documents
    add constraint teacher_documents_id_owner_unique
    unique (id, owner_id);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Source-only chunki dokumentu
-- -----------------------------------------------------------------------------

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),

  document_id uuid not null,
  owner_id uuid not null,

  chunk_index integer not null
    check (chunk_index > 0),

  content text not null
    check (btrim(content) <> ''),

  content_hash text not null
    check (content_hash ~ '^[0-9a-f]{64}$'),

  start_block_index integer not null
    check (start_block_index > 0),

  end_block_index integer not null
    check (end_block_index >= start_block_index),

  block_indices integer[] not null,

  block_count integer not null
    check (block_count > 0),

  heading_path text[] not null
    default '{}'::text[],

  char_count integer not null
    check (char_count > 0),

  token_count_estimate integer not null
    check (token_count_estimate > 0),

  max_chunk_chars integer not null
    check (max_chunk_chars >= 200),

  is_oversized boolean not null,

  chunking_version text not null
    default 'source_only_v1'
    check (btrim(chunking_version) <> ''),

  created_at timestamptz not null
    default now(),

  constraint document_chunks_document_owner_fk
    foreign key (document_id, owner_id)
    references public.teacher_documents(id, owner_id)
    on delete cascade,

  constraint document_chunks_document_index_unique
    unique (document_id, chunk_index),

  constraint document_chunks_block_indices_not_empty
    check (cardinality(block_indices) > 0),

  constraint document_chunks_block_indices_no_nulls
    check (array_position(block_indices, null) is null),

  constraint document_chunks_block_indices_positive
    check (0 < all (block_indices)),

 constraint document_chunks_block_cardinality_check
  check (block_count = cardinality(block_indices)),

  constraint document_chunks_start_block_check
    check (
      start_block_index = block_indices[1]
    ),

  constraint document_chunks_end_block_check
    check (
      end_block_index =
        block_indices[cardinality(block_indices)]
    ),

  constraint document_chunks_oversized_check
    check (
      is_oversized =
        (char_count > max_chunk_chars)
    )
);

-- -----------------------------------------------------------------------------
-- 3. Indeksy
-- -----------------------------------------------------------------------------

-- Wspiera:
-- - RLS po owner_id,
-- - pobieranie chunków jednego dokumentu,
-- - zachowanie kolejności chunk_index.

create index if not exists
document_chunks_owner_document_index_idx
on public.document_chunks (
  owner_id,
  document_id,
  chunk_index
);

-- -----------------------------------------------------------------------------
-- 4. RLS i uprawnienia
-- -----------------------------------------------------------------------------

-- Najpierw usuwamy wszystkie istniejące uprawnienia,
-- również te wynikające z domyślnej konfiguracji schematu public.

revoke all
on table public.document_chunks
from anon, authenticated, service_role;

-- Przeglądarka może tylko odczytywać własne chunki.
-- Widoczne rekordy dodatkowo ogranicza RLS.

grant select
on table public.document_chunks
to authenticated;

-- Serwerowy ingestion może sprawdzić istniejące
-- chunki i zapisać nowe.

grant select, insert
on table public.document_chunks
to service_role;

-- Serwerowy ingestion:
-- - sprawdza istniejące chunki,
-- - zapisuje nowe chunki.
--
-- Nie przyznajemy jeszcze UPDATE ani DELETE.
-- Reprocessing będzie osobnym, kontrolowanym etapem.

grant select, insert
on table public.document_chunks
to service_role;

-- Nie tworzymy polityk INSERT / UPDATE / DELETE.
--
-- Secret/service-role działa wyłącznie po stronie serwera.
-- Usunięcie teacher_documents usuwa chunki przez ON DELETE CASCADE.

-- -----------------------------------------------------------------------------
-- 5. Kontrole po migracji
-- -----------------------------------------------------------------------------

-- Kolumny:
--
-- select
--   column_name,
--   data_type,
--   udt_name,
--   is_nullable,
--   column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'document_chunks'
-- order by ordinal_position;

-- Constrainty:
--
-- select
--   conname,
--   pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.document_chunks'::regclass
-- order by conname;

-- Indeksy:
--
-- select
--   indexname,
--   indexdef
-- from pg_indexes
-- where schemaname = 'public'
--   and tablename = 'document_chunks'
-- order by indexname;

-- RLS:
--
-- select
--   policyname,
--   cmd,
--   roles,
--   qual,
--   with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename = 'document_chunks';

-- Uprawnienia:
--
-- select
--   grantee,
--   privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name = 'document_chunks'
-- order by grantee, privilege_type;