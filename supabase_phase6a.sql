-- ACQ SCUOLA CALCIO · FASE 6A · RUOLO SEGRETARIO
-- ESEGUIRE IN SUPABASE → SQL EDITOR PRIMA DEL DEPLOY

alter table public.user_profiles
drop constraint if exists user_profiles_role_check;

alter table public.user_profiles
add constraint user_profiles_role_check
check (role in ('director','coordinator','coach','collaborator','secretary'));

-- Il Segretario deve poter leggere e aggiornare l'archivio condiviso
-- per presenze, tesserati e documenti. La UI dedicata impedisce
-- l'accesso alle funzioni tecniche.

drop policy if exists "Active writers can insert app state" on public.app_state;
create policy "Active writers can insert app state"
on public.app_state for insert to authenticated
with check (
  exists(
    select 1 from public.user_profiles p
    where p.id=auth.uid()
      and p.active=true
      and p.role in ('director','coordinator','coach','secretary')
  )
);

drop policy if exists "Active writers can update app state" on public.app_state;
create policy "Active writers can update app state"
on public.app_state for update to authenticated
using (
  exists(
    select 1 from public.user_profiles p
    where p.id=auth.uid()
      and p.active=true
      and p.role in ('director','coordinator','coach','secretary')
  )
)
with check (
  exists(
    select 1 from public.user_profiles p
    where p.id=auth.uid()
      and p.active=true
      and p.role in ('director','coordinator','coach','secretary')
  )
);

drop policy if exists "Active writers upload ACQ files" on storage.objects;
create policy "Active writers upload ACQ files"
on storage.objects for insert to authenticated
with check (
  bucket_id='acq-files'
  and exists(
    select 1 from public.user_profiles p
    where p.id=auth.uid()
      and p.active=true
      and p.role in ('director','coordinator','coach','secretary')
  )
);

drop policy if exists "Active writers update ACQ files" on storage.objects;
create policy "Active writers update ACQ files"
on storage.objects for update to authenticated
using (
  bucket_id='acq-files'
  and exists(
    select 1 from public.user_profiles p
    where p.id=auth.uid()
      and p.active=true
      and p.role in ('director','coordinator','coach','secretary')
  )
)
with check (
  bucket_id='acq-files'
  and exists(
    select 1 from public.user_profiles p
    where p.id=auth.uid()
      and p.active=true
      and p.role in ('director','coordinator','coach','secretary')
  )
);

drop policy if exists "Managers delete ACQ files" on storage.objects;
create policy "Managers delete ACQ files"
on storage.objects for delete to authenticated
using (
  bucket_id='acq-files'
  and exists(
    select 1 from public.user_profiles p
    where p.id=auth.uid()
      and p.active=true
      and p.role in ('director','coordinator','secretary')
  )
);
