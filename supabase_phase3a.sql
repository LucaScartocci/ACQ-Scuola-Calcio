-- ACQ SCUOLA CALCIO · FASE 3A
-- ESEGUIRE UNA SOLA VOLTA IN SUPABASE → SQL EDITOR

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  role text not null default 'collaborator'
    check (role in ('director','coordinator','coach','collaborator')),
  categories text[] not null default '{}',
  coach_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create or replace function public.is_acq_director()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'director' and active = true
  );
$$;

drop policy if exists "Users read own profile" on public.user_profiles;
create policy "Users read own profile"
on public.user_profiles for select to authenticated
using (id = auth.uid() or public.is_acq_director());

drop policy if exists "Director updates profiles" on public.user_profiles;
create policy "Director updates profiles"
on public.user_profiles for update to authenticated
using (public.is_acq_director())
with check (public.is_acq_director());

grant select, update on public.user_profiles to authenticated;

create or replace function public.handle_new_acq_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles(id,email,first_name,last_name,role,categories,coach_name,active)
  values(
    new.id,
    coalesce(new.email,''),
    upper(coalesce(new.raw_user_meta_data->>'first_name','')),
    upper(coalesce(new.raw_user_meta_data->>'last_name','')),
    'collaborator',
    '{}',
    '',
    true
  )
  on conflict(id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_acq on auth.users;
create trigger on_auth_user_created_acq
after insert on auth.users
for each row execute procedure public.handle_new_acq_user();

insert into public.user_profiles(id,email,first_name,last_name,role,categories,coach_name,active)
select
  id,
  coalesce(email,''),
  upper(coalesce(raw_user_meta_data->>'first_name','')),
  upper(coalesce(raw_user_meta_data->>'last_name','')),
  case when email='lucascartocci@gmail.com' then 'director' else 'collaborator' end,
  case when email='lucascartocci@gmail.com'
    then array['PICCOLI AMICI','PRIMI CALCI','PULCINI','ESORDIENTI']::text[]
    else '{}'::text[]
  end,
  case when email='lucascartocci@gmail.com' then 'SCARTOCCI' else '' end,
  true
from auth.users
on conflict(id) do update set
  email=excluded.email,
  role=case when excluded.email='lucascartocci@gmail.com' then 'director' else public.user_profiles.role end,
  categories=case when excluded.email='lucascartocci@gmail.com' then excluded.categories else public.user_profiles.categories end,
  coach_name=case when excluded.email='lucascartocci@gmail.com' then 'SCARTOCCI' else public.user_profiles.coach_name end;

-- Limita l'archivio agli utenti attivi.
drop policy if exists "Authenticated users can read app state" on public.app_state;
drop policy if exists "Active users can read app state" on public.app_state;
create policy "Active users can read app state"
on public.app_state for select to authenticated
using (
  exists(select 1 from public.user_profiles p where p.id=auth.uid() and p.active=true)
);

drop policy if exists "Authenticated users can insert app state" on public.app_state;
drop policy if exists "Active writers can insert app state" on public.app_state;
create policy "Active writers can insert app state"
on public.app_state for insert to authenticated
with check (
  exists(select 1 from public.user_profiles p where p.id=auth.uid() and p.active=true and p.role in ('director','coordinator','coach'))
);

drop policy if exists "Authenticated users can update app state" on public.app_state;
drop policy if exists "Active writers can update app state" on public.app_state;
create policy "Active writers can update app state"
on public.app_state for update to authenticated
using (
  exists(select 1 from public.user_profiles p where p.id=auth.uid() and p.active=true and p.role in ('director','coordinator','coach'))
)
with check (
  exists(select 1 from public.user_profiles p where p.id=auth.uid() and p.active=true and p.role in ('director','coordinator','coach'))
);

grant select,insert,update on public.app_state to authenticated;


-- STORAGE: SOLTANTO UTENTI ATTIVI POSSONO LEGGERE.
-- SOLTANTO DIRETTORE, COORDINATORE E ALLENATORE POSSONO SCRIVERE.
drop policy if exists "Authenticated upload ACQ files" on storage.objects;
drop policy if exists "Authenticated update ACQ files" on storage.objects;
drop policy if exists "Authenticated delete ACQ files" on storage.objects;
drop policy if exists "Public read ACQ files" on storage.objects;
drop policy if exists "Active users read ACQ files" on storage.objects;
drop policy if exists "Active writers upload ACQ files" on storage.objects;
drop policy if exists "Active writers update ACQ files" on storage.objects;
drop policy if exists "Managers delete ACQ files" on storage.objects;

create policy "Active users read ACQ files"
on storage.objects for select to authenticated
using (
  bucket_id='acq-files'
  and exists(select 1 from public.user_profiles p where p.id=auth.uid() and p.active=true)
);

create policy "Active writers upload ACQ files"
on storage.objects for insert to authenticated
with check (
  bucket_id='acq-files'
  and exists(
    select 1 from public.user_profiles p
    where p.id=auth.uid() and p.active=true and p.role in ('director','coordinator','coach')
  )
);

create policy "Active writers update ACQ files"
on storage.objects for update to authenticated
using (
  bucket_id='acq-files'
  and exists(
    select 1 from public.user_profiles p
    where p.id=auth.uid() and p.active=true and p.role in ('director','coordinator','coach')
  )
)
with check (
  bucket_id='acq-files'
  and exists(
    select 1 from public.user_profiles p
    where p.id=auth.uid() and p.active=true and p.role in ('director','coordinator','coach')
  )
);

create policy "Managers delete ACQ files"
on storage.objects for delete to authenticated
using (
  bucket_id='acq-files'
  and exists(
    select 1 from public.user_profiles p
    where p.id=auth.uid() and p.active=true and p.role in ('director','coordinator')
  )
);
