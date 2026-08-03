-- ACQ SCUOLA CALCIO · FASE 3D
-- CENTRO NOTIFICHE E STATO LETTO/NON LETTO
-- ESEGUIRE UNA SOLA VOLTA IN SUPABASE → SQL EDITOR

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  title text not null,
  message text not null default '',
  notification_type text not null default 'system'
    check (notification_type in ('session','exercise','match','document','backup','user','system')),
  priority text not null default 'normal'
    check (priority in ('normal','high')),
  category text not null default '',
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text not null default '',
  actor_name text not null default '',
  actor_role text not null default '',
  object_type text not null default '',
  object_id text not null default '',
  target_all boolean not null default false,
  target_roles text[] not null default '{}',
  target_categories text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_created_at_idx
  on public.notifications(created_at desc);

create index if not exists notifications_category_idx
  on public.notifications(category);

create index if not exists notifications_type_idx
  on public.notifications(notification_type);

create table if not exists public.notification_reads (
  notification_id bigint not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index if not exists notification_reads_user_idx
  on public.notification_reads(user_id, read_at desc);

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

drop policy if exists "Active users read targeted notifications" on public.notifications;
create policy "Active users read targeted notifications"
on public.notifications
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles profile
    where profile.id = auth.uid()
      and profile.active = true
      and (
        notifications.target_all = true
        or profile.role = any(notifications.target_roles)
        or profile.categories && notifications.target_categories
        or profile.role in ('director','coordinator')
      )
  )
);

drop policy if exists "Users read own notification receipts" on public.notification_reads;
create policy "Users read own notification receipts"
on public.notification_reads
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users insert own notification receipts" on public.notification_reads;
create policy "Users insert own notification receipts"
on public.notification_reads
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users update own notification receipts" on public.notification_reads;
create policy "Users update own notification receipts"
on public.notification_reads
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select on public.notifications to authenticated;
grant select, insert, update on public.notification_reads to authenticated;

-- Converte automaticamente le operazioni importanti dell'audit log in notifiche.
create or replace function public.create_acq_notification_from_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_type text := 'system';
  resolved_title text := 'NUOVA ATTIVITÀ';
  resolved_priority text := 'normal';
  resolved_target_all boolean := false;
  resolved_roles text[] := array['director','coordinator'];
  resolved_categories text[] := '{}';
begin
  -- Non trasformiamo accessi e operazioni puramente tecniche in notifiche.
  if new.action like 'ACCESSO%'
     or new.action like 'ANNULLA%'
     or new.action like 'RIPRISTINA%'
     or new.action like 'ESPORTA%'
  then
    return new;
  end if;

  if new.object_type = 'SESSIONE' then
    resolved_type := 'session';
    resolved_title := case
      when new.action like 'CREA%' then 'NUOVA SESSIONE'
      when new.action like 'ELIMINA%' then 'SESSIONE ELIMINATA'
      else 'SESSIONE AGGIORNATA'
    end;
  elsif new.object_type = 'ESERCITAZIONE' then
    resolved_type := 'exercise';
    resolved_title := case
      when new.action like 'CREA%' then 'NUOVA ESERCITAZIONE'
      when new.action like 'ELIMINA%' then 'ESERCITAZIONE ELIMINATA'
      else 'ESERCITAZIONE AGGIORNATA'
    end;
  elsif new.object_type = 'CALENDARIO PARTITE' then
    resolved_type := 'match';
    resolved_title := 'CALENDARIO PARTITE AGGIORNATO';
  elsif new.object_type = 'DOCUMENTO' then
    resolved_type := 'document';
    resolved_title := case
      when new.action like 'ELIMINA%' then 'DOCUMENTO ELIMINATO'
      else 'NUOVO DOCUMENTO'
    end;
  elsif new.object_type = 'BACKUP' then
    resolved_type := 'backup';
    resolved_title := 'ARCHIVIO RIPRISTINATO';
    resolved_priority := 'high';
  elsif new.object_type = 'UTENTE' then
    resolved_type := 'user';
    resolved_title := 'PROFILO UTENTE AGGIORNATO';
  else
    resolved_type := 'system';
    resolved_title := new.action;
  end if;

  if coalesce(new.category,'') <> '' then
    resolved_categories := array[new.category];
    resolved_roles := array['director','coordinator'];
  else
    resolved_target_all := true;
    resolved_roles := '{}';
  end if;

  if new.action like 'ELIMINA%' or new.action like 'IMPORTA%' then
    resolved_priority := 'high';
  end if;

  insert into public.notifications (
    title,
    message,
    notification_type,
    priority,
    category,
    actor_id,
    actor_email,
    actor_name,
    actor_role,
    object_type,
    object_id,
    target_all,
    target_roles,
    target_categories,
    metadata,
    created_at
  )
  values (
    resolved_title,
    coalesce(new.details,''),
    resolved_type,
    resolved_priority,
    coalesce(new.category,''),
    new.user_id,
    coalesce(new.user_email,''),
    coalesce(new.user_name,''),
    coalesce(new.user_role,''),
    coalesce(new.object_type,''),
    coalesce(new.object_id,''),
    resolved_target_all,
    resolved_roles,
    resolved_categories,
    jsonb_build_object('audit_log_id',new.id) || coalesce(new.metadata,'{}'::jsonb),
    new.created_at
  );

  return new;
end;
$$;

drop trigger if exists audit_log_to_notification on public.audit_logs;
create trigger audit_log_to_notification
after insert on public.audit_logs
for each row
execute procedure public.create_acq_notification_from_audit();

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notification_reads;
exception
  when duplicate_object then null;
end $$;

-- Notifica iniziale di attivazione della funzione.
insert into public.notifications (
  title,
  message,
  notification_type,
  priority,
  target_all,
  created_at
)
values (
  'CENTRO NOTIFICHE ATTIVATO',
  'IL GESTIONALE ORA SEGNALA AUTOMATICAMENTE LE ATTIVITÀ IMPORTANTI.',
  'system',
  'normal',
  true,
  now()
);
