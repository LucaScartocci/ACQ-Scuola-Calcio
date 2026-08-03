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
