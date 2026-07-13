-- ============================================================================
-- Private RAG — odczyt prywatnego katalogu lekcji przez warstwę serwerową
-- Data: 2026-07-13
--
-- Cel:
-- umożliwić kontrolowanemu backendowi Private RAG:
-- - odnalezienie prywatnego katalogu nauczyciela,
-- - pobranie tematów potrzebnych do automatycznego przypisania DOCX.
--
-- Nie przyznajemy INSERT, UPDATE ani DELETE.
-- Nie zmieniamy uprawnień anon i authenticated.
-- Nie zmieniamy polityk RLS.
-- ============================================================================

grant select
on table
  public.lesson_catalogs,
  public.lesson_topics
to service_role;


-- ----------------------------------------------------------------------------
-- Kontrola
-- ----------------------------------------------------------------------------

select
  has_table_privilege(
    'service_role',
    'public.lesson_catalogs',
    'select'
  ) as can_select_lesson_catalogs,

  has_table_privilege(
    'service_role',
    'public.lesson_topics',
    'select'
  ) as can_select_lesson_topics;