-- SmartTeacher Next
-- Minimalne uprawnienie serwerowego Generatora
-- do odczytu działu podczas generowania Sprawdzianu.
-- Data: 2026-08-05
--
-- Nie przyznajemy INSERT, UPDATE ani DELETE.
-- Nie zmieniamy uprawnień anon i authenticated.
-- Nie zmieniamy polityk RLS.

begin;

grant select
on table public.lesson_sections
to service_role;

commit;

-- Kontrola:

select
  has_table_privilege(
    'service_role',
    'public.lesson_sections',
    'select'
  ) as service_role_can_select_lesson_sections;
