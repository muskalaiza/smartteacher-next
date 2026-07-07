-- SmartTeacher Next
-- Etap B1: CSV import katalogu lekcji
-- Data: 2026-07-07
--
-- Cel:
-- CSV -> walidacja -> lesson_plan_imports / lesson_plan_items
--
-- Ten plik NIE tworzy jeszcze docelowego katalogu Generatora:
-- - nie tworzy lesson_catalogs
-- - nie tworzy lesson_sections
-- - nie tworzy lesson_topics
-- - nie rusza Generatora
-- - nie rusza DOCX ingestion

create table if not exists public.lesson_plan_imports (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,

  -- CSV może być powiązany z plikiem zapisanym wcześniej w teacher_documents.
  -- Pole jest nullable, żeby później umożliwić także import bezpośredni.
  teacher_document_id uuid null references public.teacher_documents(id) on delete set null,

  source_system text not null default 'manual_csv'
    check (source_system in ('manual_csv', 'librus')),

  original_file_name text not null,

  status text not null default 'uploaded'
    check (status in ('uploaded', 'parsed', 'mapped', 'error')),

  row_count integer not null default 0
    check (row_count >= 0),

  error_message text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_plan_items (
  id uuid primary key default gen_random_uuid(),

  import_id uuid not null references public.lesson_plan_imports(id) on delete cascade,

  -- Denormalizacja celowa:
  -- ułatwia RLS, filtrowanie po nauczycielu i filtrowanie po aktywnym przedmiocie.
  owner_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,

  source_row_number integer not null
    check (source_row_number > 0),

  section_title text not null
    check (length(trim(section_title)) > 0),

  topic_title text not null
    check (length(trim(topic_title)) > 0),

  -- W B1 jeszcze nie tworzymy lesson_topics.
  -- Dlatego pole zostaje uuid nullable bez FK.
  -- FK dodamy dopiero w etapie B2, kiedy powstanie docelowy katalog tematów.
  mapped_lesson_topic_id uuid null,

  lesson_key text null,

  order_index integer not null
    check (order_index > 0),

  mapping_status text not null default 'unmapped'
    check (mapping_status in ('mapped', 'unmapped', 'ambiguous', 'ignored')),

  created_at timestamptz not null default now()
);

create index if not exists lesson_plan_imports_owner_subject_idx
  on public.lesson_plan_imports(owner_id, subject_id, created_at desc);

create index if not exists lesson_plan_imports_teacher_document_idx
  on public.lesson_plan_imports(teacher_document_id);

create index if not exists lesson_plan_items_import_order_idx
  on public.lesson_plan_items(import_id, order_index);

create index if not exists lesson_plan_items_owner_subject_idx
  on public.lesson_plan_items(owner_id, subject_id, order_index);

create unique index if not exists lesson_plan_items_import_row_unique_idx
  on public.lesson_plan_items(import_id, source_row_number);

alter table public.lesson_plan_imports enable row level security;
alter table public.lesson_plan_items enable row level security;

grant select, insert, update, delete on public.lesson_plan_imports to authenticated;
grant select, insert, update, delete on public.lesson_plan_items to authenticated;

drop policy if exists "lesson_plan_imports_select_own" on public.lesson_plan_imports;
create policy "lesson_plan_imports_select_own"
on public.lesson_plan_imports
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "lesson_plan_imports_insert_own" on public.lesson_plan_imports;
create policy "lesson_plan_imports_insert_own"
on public.lesson_plan_imports
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.teacher_subjects ts
    where ts.owner_id = auth.uid()
      and ts.subject_id = lesson_plan_imports.subject_id
      and ts.is_active = true
  )
  and (
    teacher_document_id is null
    or exists (
      select 1
      from public.teacher_documents td
      where td.id = lesson_plan_imports.teacher_document_id
        and td.owner_id = auth.uid()
        and td.subject_id = lesson_plan_imports.subject_id
    )
  )
);

drop policy if exists "lesson_plan_imports_update_own" on public.lesson_plan_imports;
create policy "lesson_plan_imports_update_own"
on public.lesson_plan_imports
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "lesson_plan_imports_delete_own" on public.lesson_plan_imports;
create policy "lesson_plan_imports_delete_own"
on public.lesson_plan_imports
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "lesson_plan_items_select_own" on public.lesson_plan_items;
create policy "lesson_plan_items_select_own"
on public.lesson_plan_items
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "lesson_plan_items_insert_own" on public.lesson_plan_items;
create policy "lesson_plan_items_insert_own"
on public.lesson_plan_items
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.lesson_plan_imports lpi
    where lpi.id = lesson_plan_items.import_id
      and lpi.owner_id = auth.uid()
      and lpi.subject_id = lesson_plan_items.subject_id
  )
);

drop policy if exists "lesson_plan_items_update_own" on public.lesson_plan_items;
create policy "lesson_plan_items_update_own"
on public.lesson_plan_items
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "lesson_plan_items_delete_own" on public.lesson_plan_items;
create policy "lesson_plan_items_delete_own"
on public.lesson_plan_items
for delete
to authenticated
using (owner_id = auth.uid());

-- Kontrola po wykonaniu SQL:
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('lesson_plan_imports', 'lesson_plan_items')
order by tablename;

select
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('lesson_plan_imports', 'lesson_plan_items')
order by tablename, policyname;