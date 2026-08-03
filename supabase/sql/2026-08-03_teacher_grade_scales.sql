begin;

create table if not exists public.teacher_grade_scales (
  owner_id uuid primary key
    references auth.users(id) on delete cascade,

  grade_2_min smallint not null,
  grade_3_min smallint not null,
  grade_4_min smallint not null,
  grade_5_min smallint not null,
  grade_6_min smallint not null,

  scale_schema_version text not null
    default 'teacher_grade_scale_v1',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint teacher_grade_scales_thresholds_range_check
    check (
      grade_2_min between 1 and 100
      and grade_3_min between 1 and 100
      and grade_4_min between 1 and 100
      and grade_5_min between 1 and 100
      and grade_6_min between 1 and 100
    ),

  constraint teacher_grade_scales_thresholds_order_check
    check (
      grade_2_min < grade_3_min
      and grade_3_min < grade_4_min
      and grade_4_min < grade_5_min
      and grade_5_min < grade_6_min
    ),

  constraint teacher_grade_scales_schema_version_check
    check (scale_schema_version = 'teacher_grade_scale_v1')
);

create or replace function public.set_teacher_grade_scale_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists teacher_grade_scales_set_updated_at
on public.teacher_grade_scales;

create trigger teacher_grade_scales_set_updated_at
before update on public.teacher_grade_scales
for each row
execute function public.set_teacher_grade_scale_updated_at();

alter table public.teacher_grade_scales enable row level security;

grant usage on schema public to authenticated, service_role;

revoke all on table public.teacher_grade_scales from anon;
revoke all on table public.teacher_grade_scales from authenticated;

grant select, insert, update
on table public.teacher_grade_scales
to authenticated;

grant select, insert, update, delete
on table public.teacher_grade_scales
to service_role;

drop policy if exists teacher_grade_scales_select_own
on public.teacher_grade_scales;

create policy teacher_grade_scales_select_own
on public.teacher_grade_scales
for select
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists teacher_grade_scales_insert_own
on public.teacher_grade_scales;

create policy teacher_grade_scales_insert_own
on public.teacher_grade_scales
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists teacher_grade_scales_update_own
on public.teacher_grade_scales;

create policy teacher_grade_scales_update_own
on public.teacher_grade_scales
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

commit;

-- Kontrola po migracji:
select
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'teacher_grade_scales'
order by c.ordinal_position;

select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'teacher_grade_scales'
order by policyname;
