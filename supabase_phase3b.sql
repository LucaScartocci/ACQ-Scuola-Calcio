-- ACQ SCUOLA CALCIO · FASE 3B
-- REGISTRO MODIFICHE PERMANENTE E IMMUTABILE
-- ESEGUIRE UNA SOLA VOLTA IN SUPABASE → SQL EDITOR

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  action text not null,
  details text not null default '',
  category text not null default '',
  object_type text not null default '',
  object_id text not null default '',
  user_id uuid not null references auth.users(id) on delete restrict,
  user_email text not null default '',
  user_name text not null default '',
  user_role text not null default '',
  device text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs(created_at desc);

create index if not exists audit_logs_user_id_idx
  on public.audit_logs(user_id);

create index if not exists audit_logs_category_idx
  on public.audit_logs(category);

create index if not exists audit_logs_action_idx
  on public.audit_logs(action);

alter table public.audit_logs enable row level security;

drop policy if exists "Active users insert own audit logs" on public.audit_logs;
create policy "Active users insert own audit logs"
on public.audit_logs
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists(
    select 1
    from public.user_profiles profile
    where profile.id = auth.uid() and profile.active = true
  )
);

drop policy if exists "Managers read all audit logs" on public.audit_logs;
create policy "Managers read all audit logs"
on public.audit_logs
for select
to authenticated
using (
  exists(
    select 1
    from public.user_profiles profile
    where profile.id = auth.uid()
      and profile.active = true
      and profile.role in ('director','coordinator')
  )
);

drop policy if exists "Coaches read own audit logs" on public.audit_logs;
create policy "Coaches read own audit logs"
on public.audit_logs
for select
to authenticated
using (
  user_id = auth.uid()
  and exists(
    select 1
    from public.user_profiles profile
    where profile.id = auth.uid()
      and profile.active = true
      and profile.role in ('coach','collaborator')
  )
);

grant select, insert on public.audit_logs to authenticated;

-- Il registro è intenzionalmente immutabile:
-- non vengono create policy UPDATE o DELETE.

do $$
begin
  alter publication supabase_realtime add table public.audit_logs;
exception
  when duplicate_object then null;
end $$;
