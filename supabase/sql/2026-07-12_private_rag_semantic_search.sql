-- SmartTeacher Next
-- Private RAG: semantic retrieval RPC
-- Data: 2026-07-12
-- Projekt: smartteacher-next / Supabase: smartteacher-next-dev
--
-- Zakres:
-- - dokładne wyszukiwanie semantyczne po document_embeddings
-- - filtr właściciela
-- - filtr jawnie wskazanych dokumentów źródłowych
-- - zgodność modelu embeddingów
-- - zwrot source-only chunka i cosine similarity
-- - dostęp wyłącznie dla service_role
--
-- Poza zakresem:
-- - generowanie embeddingu zapytania
-- - próg minimalnej trafności
-- - hybrid search
-- - HNSW
-- - status ready
-- - integracja z Generatorem

create or replace function public.search_private_document_chunks(
  p_owner_id uuid,
  p_document_ids uuid[],
  p_query_embedding extensions.vector(1536),
  p_embedding_model text,
  p_match_count integer default 5
)
returns table (
  chunk_id uuid,
  document_id uuid,
  chunk_index integer,
  content text,
  content_hash text,
  heading_path text[],
  block_indices integer[],
  start_block_index integer,
  end_block_index integer,
  similarity double precision
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    c.id as chunk_id,
    c.document_id,
    c.chunk_index,
    c.content,
    c.content_hash,
    c.heading_path,
    c.block_indices,
    c.start_block_index,
    c.end_block_index,
    1 - (
      e.embedding
      OPERATOR(extensions.<=>)
      p_query_embedding
    ) as similarity
  from public.document_embeddings as e
  inner join public.document_chunks as c
    on c.id = e.chunk_id
   and c.owner_id = e.owner_id
   and c.content_hash = e.content_hash
  where e.owner_id = p_owner_id
    and c.owner_id = p_owner_id
    and c.document_id = any (p_document_ids)
    and e.embedding_model = p_embedding_model
    and e.embedding_dimensions = 1536
  order by
    e.embedding
      OPERATOR(extensions.<=>)
      p_query_embedding,
    c.document_id,
    c.chunk_index
  limit least(
    greatest(coalesce(p_match_count, 5), 1),
    20
  );
$function$;

-- Funkcje w Postgres domyślnie mogą otrzymać EXECUTE przez PUBLIC.
-- Retrieval jest wykonywany wyłącznie przez kontrolowaną warstwę serwerową.

revoke execute
on function public.search_private_document_chunks(
  uuid,
  uuid[],
  extensions.vector,
  text,
  integer
)
from public, anon, authenticated;

grant execute
on function public.search_private_document_chunks(
  uuid,
  uuid[],
  extensions.vector,
  text,
  integer
)
to service_role;

-- -----------------------------------------------------------------------------
-- Kontrole po migracji
-- -----------------------------------------------------------------------------

-- 1. Definicja i tryb bezpieczeństwa funkcji:
--
-- select
--   n.nspname as schema_name,
--   p.proname as function_name,
--   pg_get_function_identity_arguments(p.oid) as identity_arguments,
--   p.prosecdef as security_definer,
--   p.provolatile as volatility
-- from pg_proc p
-- join pg_namespace n
--   on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname = 'search_private_document_chunks';
--
-- Oczekiwane:
-- security_definer = false
-- volatility = s

-- 2. Uprawnienia EXECUTE:
--
-- select
--   routine_name,
--   grantee,
--   privilege_type
-- from information_schema.routine_privileges
-- where specific_schema = 'public'
--   and routine_name = 'search_private_document_chunks'
-- order by grantee;
--
-- Oczekiwane:
-- service_role | EXECUTE
-- brak anon i authenticated

-- 3. Pełna definicja funkcji:
--
-- select pg_get_functiondef(
--   'public.search_private_document_chunks(
--      uuid,
--      uuid[],
--      extensions.vector,
--      text,
--      integer
--    )'::regprocedure
-- );
