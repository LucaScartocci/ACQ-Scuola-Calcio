-- ACQ SCUOLA CALCIO · FASE 6C
-- CORREZIONE DASHBOARD SEGRETARIO E RIMOZIONE COLLABORATORE
-- ESEGUIRE UNA SOLA VOLTA IN SUPABASE → SQL EDITOR

-- Converte eventuali vecchi Collaboratori in Allenatori.
update public.user_profiles
set role = 'coach'
where lower(trim(role)) in ('collaborator','collaboratore');

-- Normalizza eventuali ruoli inseriti in italiano o maiuscolo.
update public.user_profiles
set role = case lower(trim(role))
  when 'direttore' then 'director'
  when 'coordinatore' then 'coordinator'
  when 'allenatore' then 'coach'
  when 'segretario' then 'secretary'
  else lower(trim(role))
end;

alter table public.user_profiles
drop constraint if exists user_profiles_role_check;

alter table public.user_profiles
add constraint user_profiles_role_check
check (role in ('director','coordinator','coach','secretary'));

alter table public.user_profiles
alter column role set default 'coach';

-- Aggiorna la funzione di creazione automatica profili, se presente.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    categories,
    coach_name,
    active,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.email,''),
    upper(coalesce(new.raw_user_meta_data ->> 'first_name','')),
    upper(coalesce(new.raw_user_meta_data ->> 'last_name','')),
    'coach',
    '{}',
    '',
    true,
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
