-- ACQ SCUOLA CALCIO · FASE 6F
-- NOTIFICHE TECNICHE PULITE E SEPARATE DALLA SEGRETERIA
-- ESEGUIRE UNA SOLA VOLTA IN SUPABASE → SQL EDITOR

-- Rimuove le vecchie notifiche che non devono comparire
-- a Direttore, Coordinatori e Allenatori.
delete from public.notification_reads
where notification_id in (
  select id
  from public.notifications
  where object_type in (
    'PRESENZE',
    'DOCUMENTO TESSERATO',
    'ESERCITAZIONE',
    'CALENDARIO PARTITE',
    'BACKUP',
    'UTENTE'
  )
  or (
    object_type = 'DOCUMENTO'
    and coalesce(metadata ->> 'type','') not in ('meetings','teaching')
  )
);

delete from public.notifications
where object_type in (
  'PRESENZE',
  'DOCUMENTO TESSERATO',
  'ESERCITAZIONE',
  'CALENDARIO PARTITE',
  'BACKUP',
  'UTENTE'
)
or (
  object_type = 'DOCUMENTO'
  and coalesce(metadata ->> 'type','') not in ('meetings','teaching')
);

-- Elimina anche notifiche di modifica/eliminazione sessione:
-- il centro tecnico deve avvisare solo quando viene caricata una nuova seduta.
delete from public.notification_reads
where notification_id in (
  select id
  from public.notifications
  where object_type = 'SESSIONE'
    and title <> 'NUOVA SESSIONE DI ALLENAMENTO'
);

delete from public.notifications
where object_type = 'SESSIONE'
  and title <> 'NUOVA SESSIONE DI ALLENAMENTO';

create or replace function public.create_acq_notification_from_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_title text;
  resolved_message text;
  resolved_type text;
  resolved_category text := coalesce(new.category,'');
  resolved_roles text[] := array['director','coordinator','coach'];
  document_section text := lower(coalesce(new.metadata ->> 'type',''));
begin
  -- Nessuna notifica tecnica per accessi, presenze, esercitazioni,
  -- documenti tesserati, backup, utenti o altre operazioni gestionali.
  if new.action like 'ACCESSO%'
     or new.action like 'ANNULLA%'
     or new.action like 'RIPRISTINA%'
     or new.action like 'ESPORTA%'
     or new.object_type in (
       'PRESENZE',
       'DOCUMENTO TESSERATO',
       'ESERCITAZIONE',
       'CALENDARIO PARTITE',
       'BACKUP',
       'UTENTE'
     )
  then
    return new;
  end if;

  -- Notifica soltanto la creazione di una nuova sessione.
  if new.object_type = 'SESSIONE'
     and new.action = 'CREA SESSIONE'
  then
    resolved_type := 'session';
    resolved_title := 'NUOVA SESSIONE DI ALLENAMENTO';
    resolved_message :=
      coalesce(nullif(new.details,''),'NUOVA SEDUTA')
      || case
           when resolved_category <> '' then ' · ' || resolved_category
           else ''
         end;

  -- Notifica soltanto i caricamenti nelle due librerie tecniche,
  -- effettuati da un Direttore.
  elsif new.object_type = 'DOCUMENTO'
        and new.action = 'CARICA DOCUMENTI'
        and lower(coalesce(new.user_role,'')) in ('director','direttore')
        and document_section in ('meetings','teaching')
  then
    resolved_type := 'document';

    if document_section = 'meetings' then
      resolved_title := 'NUOVA RIUNIONE TECNICA';
      resolved_message := 'IL DIRETTORE HA CARICATO NUOVO MATERIALE NELLE RIUNIONI TECNICHE.';
    else
      resolved_title := 'NUOVO MATERIALE DIDATTICO';
      resolved_message := 'IL DIRETTORE HA CARICATO NUOVO MATERIALE DIDATTICO.';
    end if;

    resolved_category := '';

  else
    return new;
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
    resolved_message,
    resolved_type,
    'normal',
    resolved_category,
    new.user_id,
    coalesce(new.user_email,''),
    coalesce(new.user_name,''),
    coalesce(new.user_role,''),
    coalesce(new.object_type,''),
    coalesce(new.object_id,''),
    false,
    resolved_roles,
    case
      when resolved_category <> '' then array[resolved_category]
      else '{}'::text[]
    end,
    jsonb_build_object('audit_log_id',new.id)
      || coalesce(new.metadata,'{}'::jsonb),
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
