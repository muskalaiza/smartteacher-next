-- SmartTeacher Pakiet 3
-- Cleanup starego przeciążenia RPC importu CSV + korekta uprawnień funkcji aktualnej.
-- Data: 2026-07-31
--
-- Zakres:
-- 1. usuwa wyłącznie starą sygnaturę bez p_grade_level_id,
-- 2. pozostawia aktualną sygnaturę z p_grade_level_id,
-- 3. odbiera EXECUTE od PUBLIC i anon dla aktualnej funkcji SECURITY DEFINER,
-- 4. przyznaje EXECUTE wyłącznie authenticated.
--
-- Skrypt nie używa CASCADE i nie zmienia danych katalogu.

begin;

do $$
declare
  v_current oid := to_regprocedure(
    'public.create_private_lesson_catalog_from_import(uuid,uuid,uuid,text,text,text)'
  );
begin
  if v_current is null then
    raise exception
      'Brak aktualnej funkcji create_private_lesson_catalog_from_import(uuid,uuid,uuid,text,text,text). Przerwano migrację.';
  end if;

  if not exists (
    select 1
    from pg_proc p
    where p.oid = v_current
      and p.prosecdef = true
  ) then
    raise exception
      'Aktualna funkcja nie jest SECURITY DEFINER. Przerwano migrację do ręcznej weryfikacji.';
  end if;
end
$$;

-- Stare przeciążenie: bez p_grade_level_id.
-- Brak CASCADE: każda nieznana zależność zatrzyma migrację.
drop function if exists public.create_private_lesson_catalog_from_import(
  uuid,
  uuid,
  text,
  text,
  text
);

-- Aktualne RPC jest funkcją SECURITY DEFINER, dlatego nie powinno być
-- wykonywalne przez PUBLIC/anon.
revoke all on function public.create_private_lesson_catalog_from_import(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
) from public;

revoke all on function public.create_private_lesson_catalog_from_import(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
) from anon;

grant execute on function public.create_private_lesson_catalog_from_import(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
) to authenticated;

commit;

-- Kontrola końcowa: oczekiwane wartości opisano w instrukcji Pakietu 3.
with function_state as (
  select
    to_regprocedure(
      'public.create_private_lesson_catalog_from_import(uuid,uuid,text,text,text)'
    ) as old_oid,
    to_regprocedure(
      'public.create_private_lesson_catalog_from_import(uuid,uuid,uuid,text,text,text)'
    ) as current_oid
),
current_function as (
  select p.oid, p.prosecdef, p.proacl, p.proowner
  from function_state fs
  join pg_proc p on p.oid = fs.current_oid
)
select
  fs.old_oid is not null as old_function_exists,
  fs.current_oid is not null as current_function_exists,
  cf.prosecdef as current_is_security_definer,
  exists (
    select 1
    from aclexplode(coalesce(cf.proacl, acldefault('f', cf.proowner))) acl
    where acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) as public_can_execute,
  has_function_privilege(
    'anon',
    'public.create_private_lesson_catalog_from_import(uuid,uuid,uuid,text,text,text)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.create_private_lesson_catalog_from_import(uuid,uuid,uuid,text,text,text)',
    'EXECUTE'
  ) as authenticated_can_execute
from function_state fs
join current_function cf on true;
