-- ACQ SCUOLA CALCIO · FASE 3E
-- BACKUP AUTOMATICI, VERSIONI E RIPRISTINO

create table if not exists public.archive_backups (
  id bigint generated always as identity primary key,
  backup_type text not null default 'manual'
    check (backup_type in ('automatic','manual','pre_restore')),
  label text not null default '',
  archive_data jsonb not null,
  archive_size bigint not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text not null default '',
  created_by_name text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists archive_backups_created_at_idx on public.archive_backups(created_at desc);
create index if not exists archive_backups_type_idx on public.archive_backups(backup_type);

alter table public.archive_backups enable row level security;

drop policy if exists "Active users read backups" on public.archive_backups;
create policy "Active users read backups"
on public.archive_backups for select to authenticated
using (exists(select 1 from public.user_profiles profile where profile.id=auth.uid() and profile.active=true));

drop policy if exists "Active writers create backups" on public.archive_backups;
create policy "Active writers create backups"
on public.archive_backups for insert to authenticated
with check (
  created_by=auth.uid()
  and exists(select 1 from public.user_profiles profile where profile.id=auth.uid() and profile.active=true and profile.role in ('director','coordinator','coach'))
);

drop policy if exists "Managers delete backups" on public.archive_backups;
create policy "Managers delete backups"
on public.archive_backups for delete to authenticated
using (exists(select 1 from public.user_profiles profile where profile.id=auth.uid() and profile.active=true and profile.role in ('director','coordinator')));

grant select,insert,delete on public.archive_backups to authenticated;

create or replace function public.create_automatic_acq_backup()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  last_backup timestamptz;
  current_user_name text := '';
begin
  select max(created_at) into last_backup from public.archive_backups where backup_type='automatic';

  if last_backup is null or last_backup < now() - interval '6 hours' then
    select upper(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')))
    into current_user_name
    from public.user_profiles
    where id=auth.uid();

    insert into public.archive_backups(
      backup_type,label,archive_data,archive_size,created_by,created_by_email,created_by_name,created_at
    )
    values(
      'automatic',
      'BACKUP AUTOMATICO · ' || to_char(now(),'DD/MM/YYYY HH24:MI'),
      new.data,
      pg_column_size(new.data),
      auth.uid(),
      coalesce(auth.jwt()->>'email',''),
      coalesce(current_user_name,coalesce(auth.jwt()->>'email','SISTEMA')),
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists app_state_automatic_backup on public.app_state;
create trigger app_state_automatic_backup
after update on public.app_state
for each row execute procedure public.create_automatic_acq_backup();

create or replace function public.cleanup_old_acq_backups()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare deleted_count integer;
begin
  delete from public.archive_backups
  where backup_type='automatic'
    and created_at < now() - interval '30 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

insert into public.archive_backups(
  backup_type,label,archive_data,archive_size,created_by_email,created_by_name,created_at
)
select
  'automatic',
  'BACKUP INIZIALE · ' || to_char(now(),'DD/MM/YYYY HH24:MI'),
  data,
  pg_column_size(data),
  'setup',
  'SISTEMA',
  now()
from public.app_state
where id='acq-scuola-calcio-main'
and not exists(select 1 from public.archive_backups);

do $$
begin
  alter publication supabase_realtime add table public.archive_backups;
exception when duplicate_object then null;
end $$;
