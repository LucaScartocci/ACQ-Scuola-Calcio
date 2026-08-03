-- Se hai già eseguito lo script precedente, non serve rieseguirlo.
create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.app_state enable row level security;
drop policy if exists "Authenticated users can read app state" on public.app_state;
create policy "Authenticated users can read app state" on public.app_state for select to authenticated using (true);
drop policy if exists "Authenticated users can insert app state" on public.app_state;
create policy "Authenticated users can insert app state" on public.app_state for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update app state" on public.app_state;
create policy "Authenticated users can update app state" on public.app_state for update to authenticated using (true) with check (true);
grant select,insert,update,delete on public.app_state to authenticated;
do $$ begin alter publication supabase_realtime add table public.app_state; exception when duplicate_object then null; end $$;
insert into public.app_state(id,data,updated_by) values('acq-scuola-calcio-main','{}'::jsonb,'setup') on conflict(id) do nothing;


-- FASE 2B: STORAGE IMMAGINI E DOCUMENTI
insert into storage.buckets (id, name, public, file_size_limit)
values ('acq-files','acq-files',true,52428800)
on conflict (id) do update set public=true, file_size_limit=52428800;

drop policy if exists "Authenticated upload ACQ files" on storage.objects;
create policy "Authenticated upload ACQ files" on storage.objects
for insert to authenticated
with check (bucket_id='acq-files');

drop policy if exists "Authenticated update ACQ files" on storage.objects;
create policy "Authenticated update ACQ files" on storage.objects
for update to authenticated
using (bucket_id='acq-files')
with check (bucket_id='acq-files');

drop policy if exists "Authenticated delete ACQ files" on storage.objects;
create policy "Authenticated delete ACQ files" on storage.objects
for delete to authenticated
using (bucket_id='acq-files');

drop policy if exists "Public read ACQ files" on storage.objects;
create policy "Public read ACQ files" on storage.objects
for select to public
using (bucket_id='acq-files');
