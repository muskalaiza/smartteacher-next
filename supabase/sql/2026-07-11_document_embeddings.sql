-- SmartTeacher Next
-- Private RAG: document_embeddings
-- Data: 2026-07-11
--
-- Zakres:
-- - tabela embeddingów dla document_chunks
-- - text-embedding-3-small
-- - 1536 wymiarów
-- - powiązanie embeddingu z dokładnym content_hash chunka
-- - RLS
-- - wyłącznie dostęp serwerowy
--
-- Poza zakresem:
-- - generowanie embeddingów
-- - OpenAI SDK
-- - vector search / RPC
-- - HNSW
-- - hybrid retrieval
-- - Generator

create extension if not exists pgcrypto;

create extension if not exists vector
with schema extensions;

-- -----------------------------------------------------------------------------
-- 1. Integralność chunka, właściciela i wersji treści
-- -----------------------------------------------------------------------------

-- Embedding musi wskazywać nie tylko właściwy chunk,
-- ale również jego właściciela i dokładny content_hash.
--
-- Zapobiega to zapisaniu embeddingu wygenerowanego
-- ze starej albo innej wersji treści chunka.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'document_chunks_id_owner_hash_unique'
      and conrelid =
        'public.document_chunks'::regclass
  ) then
    alter table public.document_chunks
    add constraint
      document_chunks_id_owner_hash_unique
    unique (
      id,
      owner_id,
      content_hash
    );
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Embeddingi chunków
-- -----------------------------------------------------------------------------

create table if not exists
public.document_embeddings (
  id uuid primary key
    default gen_random_uuid(),

  chunk_id uuid not null,
  owner_id uuid not null,

  -- Hash treści, z której został wygenerowany embedding.
  content_hash text not null,

  embedding_model text not null,

  embedding_dimensions integer not null
    default 1536,

  embedding extensions.vector(1536) not null,

  created_at timestamptz not null
    default now(),

  constraint
    document_embeddings_chunk_owner_hash_fk
    foreign key (
      chunk_id,
      owner_id,
      content_hash
    )
    references public.document_chunks (
      id,
      owner_id,
      content_hash
    )
    on delete cascade,

  constraint
    document_embeddings_model_not_empty_check
    check (
      btrim(embedding_model) <> ''
    ),

  constraint
    document_embeddings_dimensions_check
    check (
      embedding_dimensions = 1536
    ),

  constraint
    document_embeddings_content_hash_check
    check (
      content_hash ~ '^[0-9a-f]{64}$'
    ),

  constraint
    document_embeddings_chunk_model_unique
    unique (
      chunk_id,
      embedding_model,
      embedding_dimensions
    )
);

-- -----------------------------------------------------------------------------
-- 3. Indeksy relacyjne
-- -----------------------------------------------------------------------------

-- Wspiera operacje serwerowe:
-- - embeddingi jednego właściciela,
-- - kontrolę kompletności embeddingów dokumentu
--   poprzez połączenie z document_chunks.

create index if not exists
document_embeddings_owner_chunk_idx
on public.document_embeddings (
  owner_id,
  chunk_id
);

-- Nie tworzymy jeszcze HNSW.
--
-- Najpierw:
-- - wygenerujemy embeddingi,
-- - utworzymy retrieval,
-- - wykonamy testy jakości i wydajności.
--
-- Indeks zostanie dodany dopiero przy rosnącej tabeli.

-- -----------------------------------------------------------------------------
-- 4. RLS i minimalne uprawnienia
-- -----------------------------------------------------------------------------

alter table public.document_embeddings
enable row level security;

-- Embeddingi są wewnętrzną warstwą aplikacji.
-- Przeglądarka nie potrzebuje bezpośredniego dostępu.

revoke all
on table public.document_embeddings
from anon, authenticated, service_role;

grant usage
on schema public, extensions
to service_role;

grant select, insert
on table public.document_embeddings
to service_role;

-- Nie tworzymy polityki dla authenticated.
-- Brak GRANT oraz brak policy oznacza brak bezpośredniego
-- dostępu nauczyciela do wektorów przez frontend.
--
-- Retrieval będzie wykonywany przez kontrolowany endpoint serwerowy.

-- -----------------------------------------------------------------------------
-- 5. Kontrole
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
--   and table_name = 'document_embeddings'
-- order by ordinal_position;

-- Typ kolumny embedding:
--
-- select
--   a.attname,
--   format_type(a.atttypid, a.atttypmod) as column_type
-- from pg_attribute a
-- where a.attrelid =
--     'public.document_embeddings'::regclass
--   and a.attname = 'embedding'
--   and a.attnum > 0
--   and not a.attisdropped;

-- Constrainty:
--
-- select
--   conname,
--   pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid =
--   'public.document_embeddings'::regclass
-- order by conname;

-- Uprawnienia:
--
-- select
--   grantee,
--   privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name = 'document_embeddings'
-- order by grantee, privilege_type;

-- Liczba embeddingów:
--
-- select count(*) as embedding_count
-- from public.document_embeddings;