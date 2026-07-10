-- SmartTeacher Next
-- Source-only DOCX ingestion: document_blocks
-- Data: 2026-07-10
-- Projekt: smartteacher-next / Supabase: smartteacher-next-dev
--
-- Zakres:
-- - tabela public.document_blocks
-- - trwałe powiązanie bloku z dokumentem i właścicielem
-- - kolejność bloków w dokumencie
-- - heading_path
-- - hash integralności treści
-- - oznaczanie bloków wyłączonych
-- - RLS: nauczyciel widzi tylko własne bloki
--
-- Poza zakresem:
-- - zapis bloków z aplikacji
-- - aktualizacja statusu teacher_documents
-- - document_chunks
-- - embeddingi
-- - retrieval
-- - integracja z Generatorem

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Integralność relacji dokument + właściciel
-- -----------------------------------------------------------------------------

-- document_blocks przechowuje owner_id dla wydajnego RLS.
-- Ten constraint umożliwia złożony klucz obcy:
--
-- document_blocks(document_id, owner_id)
-- → teacher_documents(id, owner_id)
--
-- Dzięki temu blok nie może zostać przypisany do właściciela
-- innego niż właściciel dokumentu.

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
-- 2. Source-only bloki dokumentu
-- -----------------------------------------------------------------------------

create table if not exists public.document_blocks (
  id uuid primary key default gen_random_uuid(),

  document_id uuid not null,
  owner_id uuid not null,

  block_index integer not null
    check (block_index > 0),

  block_type text not null
    check (
      block_type in (
        'heading',
        'paragraph',
        'list_item',
        'code',
        'example',
        'table_row'
      )
    ),

  heading_path text[] not null default '{}'::text[],

  content text not null
    check (btrim(content) <> ''),

  content_hash text not null
    check (content_hash ~ '^[0-9a-f]{64}$'),

  is_excluded boolean not null default false,
  exclude_reason text null,

  created_at timestamptz not null default now(),

  constraint document_blocks_document_owner_fk
    foreign key (document_id, owner_id)
    references public.teacher_documents(id, owner_id)
    on delete cascade,

  constraint document_blocks_document_index_unique
    unique (document_id, block_index),

  constraint document_blocks_exclusion_reason_check
    check (
      (
        is_excluded = false
        and exclude_reason is null
      )
      or
      (
        is_excluded = true
        and nullif(btrim(exclude_reason), '') is not null
      )
    )
);

-- -----------------------------------------------------------------------------
-- 3. Indeksy
-- -----------------------------------------------------------------------------

-- Obsługuje:
-- - politykę RLS po owner_id,
-- - pobranie bloków konkretnego dokumentu,
-- - zachowanie kolejności block_index.

create index if not exists document_blocks_owner_document_index_idx
on public.document_blocks (
  owner_id,
  document_id,
  block_index
);

-- -----------------------------------------------------------------------------
-- 4. Uprawnienia i RLS
-- -----------------------------------------------------------------------------

alter table public.document_blocks enable row level security;

grant usage on schema public to authenticated;

-- Nauczyciel może odczytać własne bloki,
-- ale nie może modyfikować źródła bezpośrednio z przeglądarki.

grant select
on table public.document_blocks
to authenticated;

revoke insert, update, delete
on table public.document_blocks
from authenticated;

drop policy if exists "document_blocks_select_own"
on public.document_blocks;

create policy "document_blocks_select_own"
on public.document_blocks
for select
to authenticated
using (
  (select auth.uid()) = owner_id
);

-- Nie tworzymy polityk INSERT / UPDATE / DELETE.
--
-- Zapis ingestion będzie wykonywany później po stronie serwera.
-- Usunięcie teacher_documents usuwa powiązane bloki
-- przez ON DELETE CASCADE.

-- -----------------------------------------------------------------------------
-- 5. Kontrola po migracji
-- -----------------------------------------------------------------------------

-- Struktura tabeli:
--
-- select
--   column_name,
--   data_type,
--   udt_name,
--   is_nullable,
--   column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'document_blocks'
-- order by ordinal_position;

-- Constrainty:
--
-- select
--   conname,
--   pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.document_blocks'::regclass
-- order by conname;

-- Indeksy:
--
-- select
--   indexname,
--   indexdef
-- from pg_indexes
-- where schemaname = 'public'
--   and tablename = 'document_blocks'
-- order by indexname;

-- Polityki RLS:
--
-- select
--   policyname,
--   cmd,
--   roles,
--   qual,
--   with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename = 'document_blocks';

-- Uprawnienia roli authenticated:
--
-- select
--   privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name = 'document_blocks'
--   and grantee = 'authenticated'
-- order by privilege_type;