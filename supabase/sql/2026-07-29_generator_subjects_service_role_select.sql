-- SmartTeacher Next
-- Minimalne uprawnienie serwerowego Generatora
-- do odczytu nazwy przedmiotu dla snapshotu cache.
-- Data: 2026-07-29

begin;

grant select
on table public.subjects
to service_role;

commit;

-- Kontrola:

select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'subjects'
  and grantee = 'service_role'
order by privilege_type;