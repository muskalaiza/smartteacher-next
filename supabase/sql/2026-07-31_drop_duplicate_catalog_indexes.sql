-- SmartTeacher Next — Pakiet 2
-- Usunięcie dwóch potwierdzonych, strukturalnie identycznych indeksów.
-- Data: 2026-07-31
-- Projekt Supabase: smartteacher-next-dev
--
-- Zachowywane indeksy kanoniczne (obecne w migracji 2026-07-08):
--   public.lesson_sections_catalog_order_idx
--   public.lesson_topics_catalog_section_order_idx
--
-- Usuwane indeksy redundantne (nieobecne w historii migracji main):
--   public.lesson_sections_catalog_active_order_idx
--   public.lesson_topics_catalog_section_active_order_idx
--
-- Skrypt nie używa CASCADE. Przed DROP sprawdza aktualny schemat,
-- równoważność strukturalną obu par i brak powiązania z constraintem.

begin;

do $$
declare
  sections_are_equal boolean;
  topics_are_equal boolean;
  redundant_sections_oid oid := to_regclass(
    'public.lesson_sections_catalog_active_order_idx'
  );
  canonical_sections_oid oid := to_regclass(
    'public.lesson_sections_catalog_order_idx'
  );
  redundant_topics_oid oid := to_regclass(
    'public.lesson_topics_catalog_section_active_order_idx'
  );
  canonical_topics_oid oid := to_regclass(
    'public.lesson_topics_catalog_section_order_idx'
  );
begin
  if canonical_sections_oid is null then
    raise exception
      'Brak indeksu kanonicznego public.lesson_sections_catalog_order_idx. Migracja przerwana.';
  end if;

  if canonical_topics_oid is null then
    raise exception
      'Brak indeksu kanonicznego public.lesson_topics_catalog_section_order_idx. Migracja przerwana.';
  end if;

  if redundant_sections_oid is not null then
    if exists (
      select 1
      from pg_constraint
      where conindid = redundant_sections_oid
    ) then
      raise exception
        'Indeks public.lesson_sections_catalog_active_order_idx obsługuje constraint. Migracja przerwana.';
    end if;

    select
      r.indrelid = c.indrelid
      and rc.relam = cc.relam
      and r.indisunique = c.indisunique
      and r.indisprimary = c.indisprimary
      and r.indisexclusion = c.indisexclusion
      and r.indisvalid = c.indisvalid
      and r.indisready = c.indisready
      and r.indkey = c.indkey
      and r.indclass = c.indclass
      and r.indcollation = c.indcollation
      and r.indoption = c.indoption
      and coalesce(pg_get_expr(r.indexprs, r.indrelid), '')
          = coalesce(pg_get_expr(c.indexprs, c.indrelid), '')
      and coalesce(pg_get_expr(r.indpred, r.indrelid), '')
          = coalesce(pg_get_expr(c.indpred, c.indrelid), '')
    into sections_are_equal
    from pg_index r
    join pg_class rc on rc.oid = r.indexrelid
    cross join pg_index c
    join pg_class cc on cc.oid = c.indexrelid
    where r.indexrelid = redundant_sections_oid
      and c.indexrelid = canonical_sections_oid;

    if sections_are_equal is distinct from true then
      raise exception
        'Indeksy lesson_sections nie są strukturalnie identyczne. Migracja przerwana.';
    end if;
  end if;

  if redundant_topics_oid is not null then
    if exists (
      select 1
      from pg_constraint
      where conindid = redundant_topics_oid
    ) then
      raise exception
        'Indeks public.lesson_topics_catalog_section_active_order_idx obsługuje constraint. Migracja przerwana.';
    end if;

    select
      r.indrelid = c.indrelid
      and rc.relam = cc.relam
      and r.indisunique = c.indisunique
      and r.indisprimary = c.indisprimary
      and r.indisexclusion = c.indisexclusion
      and r.indisvalid = c.indisvalid
      and r.indisready = c.indisready
      and r.indkey = c.indkey
      and r.indclass = c.indclass
      and r.indcollation = c.indcollation
      and r.indoption = c.indoption
      and coalesce(pg_get_expr(r.indexprs, r.indrelid), '')
          = coalesce(pg_get_expr(c.indexprs, c.indrelid), '')
      and coalesce(pg_get_expr(r.indpred, r.indrelid), '')
          = coalesce(pg_get_expr(c.indpred, c.indrelid), '')
    into topics_are_equal
    from pg_index r
    join pg_class rc on rc.oid = r.indexrelid
    cross join pg_index c
    join pg_class cc on cc.oid = c.indexrelid
    where r.indexrelid = redundant_topics_oid
      and c.indexrelid = canonical_topics_oid;

    if topics_are_equal is distinct from true then
      raise exception
        'Indeksy lesson_topics nie są strukturalnie identyczne. Migracja przerwana.';
    end if;
  end if;
end $$;

drop index if exists public.lesson_sections_catalog_active_order_idx;
drop index if exists public.lesson_topics_catalog_section_active_order_idx;

do $$
begin
  if to_regclass('public.lesson_sections_catalog_order_idx') is null
     or to_regclass('public.lesson_topics_catalog_section_order_idx') is null then
    raise exception
      'Po operacji brakuje indeksu kanonicznego. Transakcja zostanie wycofana.';
  end if;

  if to_regclass('public.lesson_sections_catalog_active_order_idx') is not null
     or to_regclass('public.lesson_topics_catalog_section_active_order_idx') is not null then
    raise exception
      'Co najmniej jeden indeks redundantny nadal istnieje. Transakcja zostanie wycofana.';
  end if;
end $$;

commit;

select
  to_regclass('public.lesson_sections_catalog_order_idx') is not null
    as sections_canonical_exists,
  to_regclass('public.lesson_sections_catalog_active_order_idx') is not null
    as sections_duplicate_exists,
  to_regclass('public.lesson_topics_catalog_section_order_idx') is not null
    as topics_canonical_exists,
  to_regclass('public.lesson_topics_catalog_section_active_order_idx') is not null
    as topics_duplicate_exists;
