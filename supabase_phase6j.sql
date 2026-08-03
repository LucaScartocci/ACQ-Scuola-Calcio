-- ACQ SCUOLA CALCIO · FASE 6J
-- SALVATAGGIO ATOMICO DOCUMENTI TECNICI
-- ESEGUIRE UNA SOLA VOLTA IN SUPABASE → SQL EDITOR

create or replace function public.acq_add_technical_documents(
  p_state_id text,
  p_section text,
  p_documents jsonb,
  p_updated_by text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_data jsonb;
  current_documents jsonb;
  current_section jsonb;
  merged_section jsonb;
  document_item jsonb;
  document_id text;
  now_iso text := to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if p_section not in ('meetings','teaching') then
    raise exception 'SEZIONE DOCUMENTI NON VALIDA';
  end if;

  if jsonb_typeof(p_documents) <> 'array' or jsonb_array_length(p_documents) = 0 then
    raise exception 'NESSUN DOCUMENTO DA SALVARE';
  end if;

  if not exists (
    select 1
    from public.user_profiles profile
    where profile.id = auth.uid()
      and profile.active = true
      and lower(trim(profile.role)) in ('director','coordinator','coach')
  ) then
    raise exception 'PERMESSO NEGATO';
  end if;

  select data
  into current_data
  from public.app_state
  where id = p_state_id
  for update;

  if current_data is null then
    current_data := jsonb_build_object(
      'documents', jsonb_build_object('meetings','[]'::jsonb,'teaching','[]'::jsonb),
      'updatedAt', now_iso
    );
  end if;

  current_documents := coalesce(current_data -> 'documents', '{}'::jsonb);
  current_section := coalesce(current_documents -> p_section, '[]'::jsonb);

  if jsonb_typeof(current_section) <> 'array' then
    current_section := '[]'::jsonb;
  end if;

  merged_section := current_section;

  for document_item in
    select value from jsonb_array_elements(p_documents)
  loop
    document_id := coalesce(document_item ->> 'id','');

    if document_id = '' then
      raise exception 'DOCUMENTO SENZA ID';
    end if;

    if not exists (
      select 1
      from jsonb_array_elements(merged_section) existing
      where existing ->> 'id' = document_id
    ) then
      merged_section := merged_section || jsonb_build_array(document_item);
    end if;
  end loop;

  current_data := jsonb_set(
    jsonb_set(
      current_data,
      array['documents',p_section],
      merged_section,
      true
    ),
    '{updatedAt}',
    to_jsonb(now_iso),
    true
  );

  insert into public.app_state(id,data,updated_at,updated_by)
  values(p_state_id,current_data,clock_timestamp(),coalesce(p_updated_by,''))
  on conflict(id) do update
  set data = excluded.data,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by;

  return current_data;
end;
$$;

create or replace function public.acq_delete_technical_document(
  p_state_id text,
  p_section text,
  p_document_id text,
  p_updated_by text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_data jsonb;
  current_documents jsonb;
  current_section jsonb;
  filtered_section jsonb;
  now_iso text := to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if p_section not in ('meetings','teaching') then
    raise exception 'SEZIONE DOCUMENTI NON VALIDA';
  end if;

  if coalesce(p_document_id,'') = '' then
    raise exception 'ID DOCUMENTO MANCANTE';
  end if;

  if not exists (
    select 1
    from public.user_profiles profile
    where profile.id = auth.uid()
      and profile.active = true
      and lower(trim(profile.role)) = 'director'
  ) then
    raise exception 'SOLO IL DIRETTORE PUÒ ELIMINARE DOCUMENTI';
  end if;

  select data
  into current_data
  from public.app_state
  where id = p_state_id
  for update;

  if current_data is null then
    raise exception 'ARCHIVIO NON TROVATO';
  end if;

  current_documents := coalesce(current_data -> 'documents', '{}'::jsonb);
  current_section := coalesce(current_documents -> p_section, '[]'::jsonb);

  filtered_section := coalesce((
    select jsonb_agg(item)
    from jsonb_array_elements(current_section) item
    where item ->> 'id' <> p_document_id
  ), '[]'::jsonb);

  current_data := jsonb_set(
    jsonb_set(
      current_data,
      array['documents',p_section],
      filtered_section,
      true
    ),
    '{updatedAt}',
    to_jsonb(now_iso),
    true
  );

  update public.app_state
  set data = current_data,
      updated_at = clock_timestamp(),
      updated_by = coalesce(p_updated_by,'')
  where id = p_state_id;

  return current_data;
end;
$$;

grant execute on function public.acq_add_technical_documents(text,text,jsonb,text) to authenticated;
grant execute on function public.acq_delete_technical_document(text,text,text,text) to authenticated;
