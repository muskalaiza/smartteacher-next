-- SmartTeacher Next
-- Etap B2: Prywatny katalog lekcji z importu CSV
-- Data: 2026-07-08
--
-- Cel:
-- lesson_plan_items
-- -> prywatny lesson_catalog
-- -> lesson_sections
-- -> lesson_topics
-- -> mapowanie lesson_plan_items na lesson_topics
--
-- Zakres:
-- - finalna wersja po teście na smartteacher-next-dev,
-- - funkcja wymaga jawnego p_grade_level_id,
-- - używa #variable_conflict use_column, bo RETURNS TABLE zawiera catalog_id,
-- - dodaje unikalny indeks wymagany przez ON CONFLICT dla lesson_topics,
-- - nie rusza Generatora,
-- - nie rusza DOCX ingestion,
-- - nie rusza embeddingów,
-- - nie rusza retrieval,
-- - nie rusza starego produkcyjnego MVP.
--
-- Wymagania wcześniejszych etapów:
-- - public.subjects
-- - public.grade_levels
-- - public.lesson_plan_imports
-- - public.lesson_plan_items
-- - public.teacher_subjects

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Tabele prywatnego katalogu lekcji
-- -----------------------------------------------------------------------------
-- Uwaga:
-- W smartteacher-next-dev tabele katalogu mogą już istnieć po wcześniejszym
-- etapie katalogu. Definicje IF NOT EXISTS są tu zabezpieczeniem i dokumentacją
-- docelowej struktury B2.

create table if not exists public.lesson_catalogs (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid null references auth.users(id) on delete cascade,
  source_type text not null
    check (source_type in ('smartteacher_base', 'teacher_private')),

  subject_id uuid not null references public.subjects(id) on delete cascade,
  grade_level_id uuid not null references public.grade_levels(id) on delete restrict,

  curriculum_level text not null default 'PP',
  language text null,
  title text not null,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_sections (
  id uuid primary key default gen_random_uuid(),

  catalog_id uuid not null references public.lesson_catalogs(id) on delete cascade,
  section_key text not null,
  display_name text not null,
  order_index integer not null check (order_index > 0),

  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint lesson_sections_catalog_section_key_unique
    unique (catalog_id, section_key)
);

create table if not exists public.lesson_topics (
  id uuid primary key default gen_random_uuid(),

  catalog_id uuid not null references public.lesson_catalogs(id) on delete cascade,
  section_id uuid not null references public.lesson_sections(id) on delete cascade,

  lesson_key text not null,
  subtopic_key text not null,
  display_title text not null,
  order_index integer not null check (order_index > 0),

  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. Indeksy i ograniczenia potrzebne do UPSERT / ON CONFLICT
-- -----------------------------------------------------------------------------

create unique index if not exists lesson_catalogs_teacher_private_unique_idx
on public.lesson_catalogs (
  owner_id,
  subject_id,
  grade_level_id,
  coalesce(curriculum_level, ''),
  coalesce(language, '')
)
where source_type = 'teacher_private';

-- Te indeksy są krytyczne dla ON CONFLICT w funkcji poniżej.
-- Bloki DO sprawdzają, czy istnieje już dowolny unikalny indeks / constraint
-- na tym samym zestawie kolumn, żeby nie tworzyć niepotrzebnych duplikatów.

do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_class tbl on tbl.oid = i.indrelid
    join pg_namespace ns on ns.oid = tbl.relnamespace
    where ns.nspname = 'public'
      and tbl.relname = 'lesson_sections'
      and i.indisunique = true
      and array(
        select a.attname::text
        from unnest(i.indkey) with ordinality as k(attnum, ord)
        join pg_attribute a
          on a.attrelid = i.indrelid
         and a.attnum = k.attnum
        order by k.ord
      ) = array['catalog_id', 'section_key']
  ) then
    execute 'create unique index lesson_sections_catalog_section_key_unique_idx on public.lesson_sections (catalog_id, section_key)';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_class tbl on tbl.oid = i.indrelid
    join pg_namespace ns on ns.oid = tbl.relnamespace
    where ns.nspname = 'public'
      and tbl.relname = 'lesson_topics'
      and i.indisunique = true
      and array(
        select a.attname::text
        from unnest(i.indkey) with ordinality as k(attnum, ord)
        join pg_attribute a
          on a.attrelid = i.indrelid
         and a.attnum = k.attnum
        order by k.ord
      ) = array['catalog_id', 'section_id', 'subtopic_key']
  ) then
    execute 'create unique index lesson_topics_catalog_section_subtopic_unique_idx on public.lesson_topics (catalog_id, section_id, subtopic_key)';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_class tbl on tbl.oid = i.indrelid
    join pg_namespace ns on ns.oid = tbl.relnamespace
    where ns.nspname = 'public'
      and tbl.relname = 'lesson_topics'
      and i.indisunique = true
      and array(
        select a.attname::text
        from unnest(i.indkey) with ordinality as k(attnum, ord)
        join pg_attribute a
          on a.attrelid = i.indrelid
         and a.attnum = k.attnum
        order by k.ord
      ) = array['catalog_id', 'lesson_key']
  ) then
    execute 'create unique index lesson_topics_catalog_lesson_key_unique_idx on public.lesson_topics (catalog_id, lesson_key)';
  end if;
end $$;

create index if not exists lesson_sections_catalog_order_idx
on public.lesson_sections (catalog_id, is_active, order_index);

create index if not exists lesson_topics_catalog_section_order_idx
on public.lesson_topics (catalog_id, section_id, is_active, order_index);

create index if not exists lesson_topics_lesson_key_idx
on public.lesson_topics (lesson_key);

-- -----------------------------------------------------------------------------
-- 3. Uzupełnienie lesson_plan_items o FK do lesson_topics
-- -----------------------------------------------------------------------------
-- W B1 mapped_lesson_topic_id było nullable bez FK.
-- W B2 można już powiązać item importu z docelowym lesson_topics.

alter table public.lesson_plan_items
  add column if not exists mapped_lesson_topic_id uuid;

alter table public.lesson_plan_items
  add column if not exists lesson_key text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lesson_plan_items_mapped_lesson_topic_id_fkey'
  ) then
    alter table public.lesson_plan_items
      add constraint lesson_plan_items_mapped_lesson_topic_id_fkey
      foreign key (mapped_lesson_topic_id)
      references public.lesson_topics(id)
      on delete set null;
  end if;
end $$;

create index if not exists lesson_plan_items_mapped_topic_idx
on public.lesson_plan_items (mapped_lesson_topic_id);

-- -----------------------------------------------------------------------------
-- 4. Helper do stabilnych kluczy technicznych
-- -----------------------------------------------------------------------------

create or replace function public.smartteacher_slugify(value text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      trim(both '_' from regexp_replace(
        translate(
          lower(coalesce(value, '')),
          'ąćęłńóśźż',
          'acelnoszz'
        ),
        '[^a-z0-9]+',
        '_',
        'g'
      )),
      ''
    ),
    'bez_nazwy'
  );
$$;

-- -----------------------------------------------------------------------------
-- 5. RLS i GRANT dla katalogu lekcji
-- -----------------------------------------------------------------------------

alter table public.lesson_catalogs enable row level security;
alter table public.lesson_sections enable row level security;
alter table public.lesson_topics enable row level security;

grant select, insert, update, delete on public.lesson_catalogs to authenticated;
grant select, insert, update, delete on public.lesson_sections to authenticated;
grant select, insert, update, delete on public.lesson_topics to authenticated;

drop policy if exists "lesson_catalogs_select_own_or_base" on public.lesson_catalogs;
create policy "lesson_catalogs_select_own_or_base"
on public.lesson_catalogs
for select
to authenticated
using (
  owner_id = auth.uid()
  or (owner_id is null and source_type = 'smartteacher_base')
);

drop policy if exists "lesson_catalogs_insert_own_private" on public.lesson_catalogs;
create policy "lesson_catalogs_insert_own_private"
on public.lesson_catalogs
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and source_type = 'teacher_private'
  and exists (
    select 1
    from public.teacher_subjects ts
    where ts.owner_id = auth.uid()
      and ts.subject_id = lesson_catalogs.subject_id
      and ts.is_active = true
  )
);

drop policy if exists "lesson_catalogs_update_own_private" on public.lesson_catalogs;
create policy "lesson_catalogs_update_own_private"
on public.lesson_catalogs
for update
to authenticated
using (
  owner_id = auth.uid()
  and source_type = 'teacher_private'
)
with check (
  owner_id = auth.uid()
  and source_type = 'teacher_private'
);

drop policy if exists "lesson_catalogs_delete_own_private" on public.lesson_catalogs;
create policy "lesson_catalogs_delete_own_private"
on public.lesson_catalogs
for delete
to authenticated
using (
  owner_id = auth.uid()
  and source_type = 'teacher_private'
);

drop policy if exists "lesson_sections_select_own_or_base" on public.lesson_sections;
create policy "lesson_sections_select_own_or_base"
on public.lesson_sections
for select
to authenticated
using (
  exists (
    select 1
    from public.lesson_catalogs c
    where c.id = lesson_sections.catalog_id
      and (
        c.owner_id = auth.uid()
        or (c.owner_id is null and c.source_type = 'smartteacher_base')
      )
  )
);

drop policy if exists "lesson_sections_write_own_private" on public.lesson_sections;
create policy "lesson_sections_write_own_private"
on public.lesson_sections
for all
to authenticated
using (
  exists (
    select 1
    from public.lesson_catalogs c
    where c.id = lesson_sections.catalog_id
      and c.owner_id = auth.uid()
      and c.source_type = 'teacher_private'
  )
)
with check (
  exists (
    select 1
    from public.lesson_catalogs c
    where c.id = lesson_sections.catalog_id
      and c.owner_id = auth.uid()
      and c.source_type = 'teacher_private'
  )
);

drop policy if exists "lesson_topics_select_own_or_base" on public.lesson_topics;
create policy "lesson_topics_select_own_or_base"
on public.lesson_topics
for select
to authenticated
using (
  exists (
    select 1
    from public.lesson_catalogs c
    where c.id = lesson_topics.catalog_id
      and (
        c.owner_id = auth.uid()
        or (c.owner_id is null and c.source_type = 'smartteacher_base')
      )
  )
);

drop policy if exists "lesson_topics_write_own_private" on public.lesson_topics;
create policy "lesson_topics_write_own_private"
on public.lesson_topics
for all
to authenticated
using (
  exists (
    select 1
    from public.lesson_catalogs c
    where c.id = lesson_topics.catalog_id
      and c.owner_id = auth.uid()
      and c.source_type = 'teacher_private'
  )
)
with check (
  exists (
    select 1
    from public.lesson_catalogs c
    where c.id = lesson_topics.catalog_id
      and c.owner_id = auth.uid()
      and c.source_type = 'teacher_private'
  )
);

-- -----------------------------------------------------------------------------
-- 6. Funkcja: import CSV -> prywatny katalog lekcji
-- -----------------------------------------------------------------------------
-- Uwaga:
-- - p_grade_level_id jest jawne, bo lesson_plan_imports w B1 nie ma grade_level_id.
-- - p_owner_id jest potrzebne do ręcznego uruchamiania w SQL Editor.
-- - w aplikacji p_owner_id można zostawić null; funkcja użyje auth.uid().
-- - usuwamy starą, błędną sygnaturę bez p_grade_level_id.

drop function if exists public.create_private_lesson_catalog_from_import(
  uuid,
  uuid,
  text,
  text,
  text
);

create or replace function public.create_private_lesson_catalog_from_import(
  p_import_id uuid,
  p_owner_id uuid default null,
  p_grade_level_id uuid default null,
  p_title text default null,
  p_curriculum_level text default 'PP',
  p_language text default null
)
returns table (
  catalog_id uuid,
  section_count integer,
  topic_count integer
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_auth_user uuid := auth.uid();
  v_owner uuid;
  v_import record;
  v_catalog_id uuid;
  v_section_count integer := 0;
  v_topic_count integer := 0;
begin
  v_owner := coalesce(v_auth_user, p_owner_id);

  if v_owner is null then
    raise exception 'Brak użytkownika. W aplikacji użyj zalogowanego użytkownika, a w SQL Editor podaj p_owner_id.';
  end if;

  if p_grade_level_id is null then
    raise exception 'Brak p_grade_level_id. Podaj id z tabeli public.grade_levels.';
  end if;

  if v_auth_user is not null and p_owner_id is not null and p_owner_id <> v_auth_user then
    raise exception 'Nie można utworzyć katalogu dla innego użytkownika.';
  end if;

  select
    id,
    owner_id,
    subject_id,
    status,
    original_file_name
  into v_import
  from public.lesson_plan_imports
  where id = p_import_id
    and owner_id = v_owner;

  if not found then
    raise exception 'Nie znaleziono importu albo import nie należy do tego użytkownika.';
  end if;

  if v_import.status not in ('parsed', 'mapped') then
    raise exception 'Import musi mieć status parsed albo mapped. Aktualny status: %', v_import.status;
  end if;

  if not exists (
    select 1
    from public.grade_levels gl
    where gl.id = p_grade_level_id
  ) then
    raise exception 'Nie znaleziono p_grade_level_id w public.grade_levels.';
  end if;

  select lc.id
  into v_catalog_id
  from public.lesson_catalogs lc
  where lc.owner_id = v_owner
    and lc.source_type = 'teacher_private'
    and lc.subject_id = v_import.subject_id
    and lc.grade_level_id = p_grade_level_id
    and coalesce(lc.curriculum_level, '') = coalesce(p_curriculum_level, 'PP')
    and coalesce(lc.language, '') = coalesce(nullif(trim(p_language), ''), '')
    and lc.is_active = true
  limit 1;

  if v_catalog_id is null then
    insert into public.lesson_catalogs (
      owner_id,
      source_type,
      subject_id,
      grade_level_id,
      curriculum_level,
      language,
      title,
      is_active
    )
    values (
      v_owner,
      'teacher_private',
      v_import.subject_id,
      p_grade_level_id,
      coalesce(p_curriculum_level, 'PP'),
      nullif(trim(p_language), ''),
      coalesce(nullif(trim(p_title), ''), 'Prywatny katalog lekcji'),
      true
    )
    returning id into v_catalog_id;
  end if;

  with section_source as (
    select
      public.smartteacher_slugify(i.section_title) as section_key,
      trim(i.section_title) as display_name,
      min(i.order_index) as first_order
    from public.lesson_plan_items i
    where i.import_id = p_import_id
      and i.owner_id = v_owner
    group by
      public.smartteacher_slugify(i.section_title),
      trim(i.section_title)
  ),
  section_numbered as (
    select
      section_key,
      display_name,
      row_number() over (order by first_order, display_name)::integer as order_index
    from section_source
  )
  insert into public.lesson_sections (
    catalog_id,
    section_key,
    display_name,
    order_index,
    is_active
  )
  select
    v_catalog_id,
    sn.section_key,
    sn.display_name,
    sn.order_index,
    true
  from section_numbered sn
  on conflict (catalog_id, section_key)
  do update set
    display_name = excluded.display_name,
    order_index = excluded.order_index,
    is_active = true;

  with prepared_topics as (
    select
      public.smartteacher_slugify(i.section_title) as section_key,
      public.smartteacher_slugify(i.topic_title) as topic_key,
      trim(i.topic_title) as display_title,
      i.order_index
    from public.lesson_plan_items i
    where i.import_id = p_import_id
      and i.owner_id = v_owner
  ),
  distinct_topics as (
    select distinct on (pt.section_key, pt.topic_key)
      pt.section_key,
      pt.topic_key,
      pt.display_title,
      pt.order_index
    from prepared_topics pt
    order by pt.section_key, pt.topic_key, pt.order_index
  )
  insert into public.lesson_topics (
    catalog_id,
    section_id,
    lesson_key,
    subtopic_key,
    display_title,
    order_index,
    is_active
  )
  select
    v_catalog_id,
    s.id,
    concat('teacher_private/', v_catalog_id::text, '/', dt.section_key, '/', dt.topic_key),
    dt.topic_key,
    dt.display_title,
    dt.order_index,
    true
  from distinct_topics dt
  join public.lesson_sections s
    on s.catalog_id = v_catalog_id
   and s.section_key = dt.section_key
  on conflict (catalog_id, section_id, subtopic_key)
  do update set
    lesson_key = excluded.lesson_key,
    display_title = excluded.display_title,
    order_index = excluded.order_index,
    is_active = true;

  with prepared_items as (
    select
      i.id as item_id,
      public.smartteacher_slugify(i.section_title) as section_key,
      public.smartteacher_slugify(i.topic_title) as topic_key
    from public.lesson_plan_items i
    where i.import_id = p_import_id
      and i.owner_id = v_owner
  )
  update public.lesson_plan_items i
  set
    mapped_lesson_topic_id = t.id,
    lesson_key = t.lesson_key,
    mapping_status = 'mapped'
  from prepared_items pi
  join public.lesson_sections s
    on s.catalog_id = v_catalog_id
   and s.section_key = pi.section_key
  join public.lesson_topics t
    on t.catalog_id = v_catalog_id
   and t.section_id = s.id
   and t.subtopic_key = pi.topic_key
  where i.id = pi.item_id;

  update public.lesson_plan_imports lpi
  set
    status = 'mapped',
    error_message = null,
    updated_at = now()
  where lpi.id = p_import_id
    and lpi.owner_id = v_owner;

  select count(distinct s.id)::integer
  into v_section_count
  from public.lesson_plan_items i
  join public.lesson_topics t
    on t.id = i.mapped_lesson_topic_id
  join public.lesson_sections s
    on s.id = t.section_id
  where i.import_id = p_import_id
    and i.owner_id = v_owner;

  select count(distinct i.mapped_lesson_topic_id)::integer
  into v_topic_count
  from public.lesson_plan_items i
  where i.import_id = p_import_id
    and i.owner_id = v_owner
    and i.mapped_lesson_topic_id is not null;

  return query
  select
    v_catalog_id as catalog_id,
    v_section_count as section_count,
    v_topic_count as topic_count;
end;
$$;

revoke all on function public.smartteacher_slugify(text) from public;
revoke all on function public.create_private_lesson_catalog_from_import(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
) from public;

grant execute on function public.smartteacher_slugify(text) to authenticated;
grant execute on function public.create_private_lesson_catalog_from_import(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
) to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Kontrola po wykonaniu SQL
-- -----------------------------------------------------------------------------

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('lesson_catalogs', 'lesson_sections', 'lesson_topics')
order by tablename;

select
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('lesson_catalogs', 'lesson_sections', 'lesson_topics')
order by tablename, policyname;

-- -----------------------------------------------------------------------------
-- 8. Przykładowe ręczne uruchomienie funkcji w SQL Editor
-- -----------------------------------------------------------------------------
-- Najpierw odczytaj import:
--
-- select
--   id,
--   owner_id,
--   subject_id,
--   original_file_name,
--   status,
--   row_count,
--   created_at
-- from public.lesson_plan_imports
-- order by created_at desc
-- limit 5;
--
-- Potem odczytaj poziom klasy:
--
-- select
--   id,
--   grade_key,
--   label,
--   order_index
-- from public.grade_levels
-- order by order_index;
--
-- Następnie uruchom:
--
-- select *
-- from public.create_private_lesson_catalog_from_import(
--   p_import_id := 'IMPORT_ID',
--   p_owner_id := 'OWNER_ID',
--   p_grade_level_id := 'GRADE_LEVEL_ID'
-- );
--
-- Oczekiwany wynik po poprawnym imporcie testowym:
-- section_count = liczba działów z CSV
-- topic_count = liczba tematów z CSV
--
-- Kontrola danych katalogu:
--
-- select
--   c.id,
--   c.title,
--   c.source_type,
--   c.subject_id,
--   c.grade_level_id,
--   c.curriculum_level,
--   c.language,
--   c.is_active,
--   c.created_at
-- from public.lesson_catalogs c
-- where c.id = 'CATALOG_ID';
--
-- select
--   s.id,
--   s.catalog_id,
--   s.section_key,
--   s.display_name,
--   s.order_index,
--   s.is_active
-- from public.lesson_sections s
-- where s.catalog_id = 'CATALOG_ID'
-- order by s.order_index;
--
-- select
--   t.id,
--   s.display_name as section_name,
--   t.subtopic_key,
--   t.display_title,
--   t.lesson_key,
--   t.order_index,
--   t.is_active
-- from public.lesson_topics t
-- join public.lesson_sections s
--   on s.id = t.section_id
-- where t.catalog_id = 'CATALOG_ID'
-- order by s.order_index, t.order_index;
--
-- select
--   i.order_index,
--   i.section_title,
--   i.topic_title,
--   i.mapping_status,
--   i.mapped_lesson_topic_id,
--   i.lesson_key
-- from public.lesson_plan_items i
-- where i.import_id = 'IMPORT_ID'
-- order by i.order_index;
