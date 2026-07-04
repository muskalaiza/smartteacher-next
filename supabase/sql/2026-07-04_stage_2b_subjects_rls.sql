-- SmartTeacher Next
-- Etap 2B: Dashboard — moje przedmioty
-- Data: 2026-07-04
--
-- Cel pliku:
-- 1. Zapisać startowy katalog globalnych przedmiotów w tabeli public.subjects.
-- 2. Udokumentować porządki wykonane w RLS:
--    - usunięcie redundantnej polityki SELECT dla public.subjects,
--    - usunięcie polityki DELETE dla public.teacher_subjects.
--
-- Ważne:
-- Ten plik dokumentuje aktualny stan bazy dev smartteacher-next-dev.
-- Nie jest jeszcze pełną migracją produkcyjną Supabase CLI.
--
-- Model danych:
-- public.subjects
--   → globalny katalog przedmiotów widoczny dla nauczycieli
--
-- public.teacher_subjects
--   → prywatny wybór przedmiotów konkretnego nauczyciela
--   → relacja: jeden nauczyciel może mieć wiele przedmiotów
--   → relacja: wielu nauczycieli może wybrać ten sam przedmiot
--
-- Zasada:
-- Nie kasujemy przedmiotów nauczyciela przez DELETE.
-- Usunięcie z panelu oznacza:
--   teacher_subjects.is_active = false


begin;


-- ============================================================
-- 1. GLOBALNY KATALOG PRZEDMIOTÓW
-- ============================================================

insert into public.subjects (subject_key, name, is_active)
values
  ('informatyka', 'Informatyka', true),
  ('programowanie_obiektowe', 'Programowanie obiektowe', true),
  ('aplikacje_mobilne', 'Aplikacje mobilne', true),
  ('aplikacje_desktopowe', 'Aplikacje desktopowe', true),
  ('bazy_danych', 'Bazy danych', true),
  ('aplikacje_internetowe', 'Aplikacje internetowe', true)
on conflict (subject_key)
do update set
  name = excluded.name,
  is_active = excluded.is_active;


-- ============================================================
-- 2. PORZĄDKI RLS DLA public.subjects
-- ============================================================
--
-- Zostawiamy jedną politykę SELECT dla aktywnych przedmiotów:
--   subjects_select_active
--
-- Usuwamy redundantną politykę:
--   read active subjects

drop policy if exists "read active subjects"
on public.subjects;


-- ============================================================
-- 3. PORZĄDKI RLS DLA public.teacher_subjects
-- ============================================================
--
-- Nie pozwalamy frontendowi usuwać rekordów teacher_subjects przez DELETE.
-- Dezaktywacja przedmiotu ma odbywać się przez:
--   update public.teacher_subjects
--   set is_active = false
--
-- Dlatego usuwamy politykę DELETE:
--   teacher_subjects_delete_own

drop policy if exists "teacher_subjects_delete_own"
on public.teacher_subjects;


commit;


-- ============================================================
-- 4. ZAPYTANIA KONTROLNE
-- ============================================================
--
-- Uruchamiaj ręcznie w SQL Editor tylko wtedy, gdy chcesz sprawdzić stan.
--
-- select subject_key, name, is_active
-- from public.subjects
-- order by name;
--
-- select
--   tablename,
--   policyname,
--   cmd,
--   qual,
--   with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('subjects', 'teacher_subjects')
-- order by tablename, policyname;
--
-- select
--   conname,
--   contype,
--   pg_get_constraintdef(oid) as definition
-- from pg_constraint
-- where conrelid in (
--   'public.subjects'::regclass,
--   'public.teacher_subjects'::regclass
-- )
-- order by conrelid::regclass::text, conname;
