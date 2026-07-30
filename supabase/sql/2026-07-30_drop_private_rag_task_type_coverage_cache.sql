-- SmartTeacher Next
-- Pakiet cleanupu 1: usunięcie wycofanego cache coverage.
-- Projekt: smartteacher-next
-- Supabase: smartteacher-next-dev
-- Data: 2026-07-30
--
-- Uruchomić dopiero po wdrożeniu kodu bez klastra coverage
-- i po pozytywnym smoke teście Generatora.
--
-- Celowo bez CASCADE: jeśli pojawiła się nieznana zależność,
-- migracja ma się zatrzymać zamiast usuwać dodatkowe obiekty.

begin;

drop table if exists public.private_rag_task_type_coverage_cache;

commit;

-- Kontrola po migracji: oczekiwany wynik to false.
select
  to_regclass(
    'public.private_rag_task_type_coverage_cache'
  ) is not null as coverage_table_exists;
