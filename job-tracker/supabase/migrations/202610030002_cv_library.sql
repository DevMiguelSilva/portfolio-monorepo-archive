-- Apply before releasing the dynamic CV-library frontend. Safe to re-run.
begin;
alter table public.saved_searches drop constraint if exists saved_searches_track_check;

create or replace function public.delete_cv_template(
  p_template_id text, p_replacement_id text, p_expected_document jsonb
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  owner_id uuid := auth.uid();
  current_doc jsonb;
  next_doc jsonb;
  replacement text;
  cv_count integer;
  affected integer;
begin
  if owner_id is null then raise exception 'Sign in to manage CV templates'; end if;
  select document into current_doc from public.master_cvs where user_id = owner_id for update;
  if current_doc is null or not ((current_doc->'cvs') ? p_template_id) then
    raise exception 'The template no longer exists';
  end if;
  if current_doc is distinct from p_expected_document then
    raise exception 'Your CV library changed in another session. Reload before deleting';
  end if;
  select count(*) into cv_count from jsonb_object_keys(current_doc->'cvs');
  if cv_count <= 1 then raise exception 'Keep at least one CV template'; end if;
  select count(*) into affected from (
    select id from public.job_applications where user_id = owner_id and status = 'saved'
      and (cv_track = p_template_id or (cv_track is null and current_doc->>'activeTrack' = p_template_id))
    union all
    select id from public.saved_searches where user_id = owner_id and track = p_template_id
  ) refs;
  if affected > 0 and nullif(p_replacement_id, '') is null then
    raise exception 'Choose a replacement for affected Saved jobs and searches';
  end if;
  replacement := nullif(p_replacement_id, '');
  if replacement is null then
    select key into replacement from jsonb_object_keys(current_doc->'cvs') as ids(key)
    where key <> p_template_id order by key limit 1;
  end if;
  if replacement = p_template_id or not ((current_doc->'cvs') ? replacement) then
    raise exception 'Choose an existing replacement template';
  end if;
  next_doc := jsonb_set(current_doc, '{cvs}', (current_doc->'cvs') - p_template_id);
  next_doc := jsonb_set(next_doc, '{names}', coalesce(next_doc->'names', '{}'::jsonb) - p_template_id);
  next_doc := jsonb_set(next_doc, '{attachments}', coalesce(next_doc->'attachments', '{}'::jsonb) - p_template_id);
  if current_doc->>'activeTrack' = p_template_id then
    next_doc := jsonb_set(next_doc, '{activeTrack}', to_jsonb(replacement));
  end if;
  next_doc := jsonb_set(next_doc, '{updatedAt}', to_jsonb(now()));

  update public.job_applications set cv_track = replacement, needs_rescore = true,
    match_score = null, updated_at = now()
  where user_id = owner_id and status = 'saved'
    and (cv_track = p_template_id or (cv_track is null and current_doc->>'activeTrack' = p_template_id));
  update public.saved_searches set track = replacement, updated_at = now()
  where user_id = owner_id and track = p_template_id;
  update public.job_inbox set matched_track = replacement, match_score = 0,
    match_reasons = '[]'::jsonb, updated_at = now()
  where user_id = owner_id and matched_track = p_template_id;
  update public.master_cvs set document = next_doc, updated_at = now() where user_id = owner_id;
  return next_doc;
end;
$$;
revoke all on function public.delete_cv_template(text, text, jsonb) from public, anon;
grant execute on function public.delete_cv_template(text, text, jsonb) to authenticated;

-- Reject stale clients that try to restore references to deleted templates.
create or replace function public.validate_cv_template_reference()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare library jsonb; template_id text;
begin
  if tg_table_name = 'saved_searches' then
    template_id := new.track;
    if template_id = 'auto' then return new; end if;
  else
    if new.status <> 'saved' or new.cv_track is null then return new; end if;
    template_id := new.cv_track;
  end if;
  select document into library from public.master_cvs where user_id = new.user_id for share;
  -- Existing clients can create the legacy choices before their library is initialized.
  if library is null or not (library ? 'cvs') then
    if template_id in ('frontend', 'powerPlatform') then return new; end if;
  elsif (library->'cvs') ? template_id then
    return new;
  end if;
  raise exception 'The selected CV template no longer exists. Choose another CV';
end;
$$;
revoke all on function public.validate_cv_template_reference() from public, anon, authenticated;
drop trigger if exists saved_search_cv_reference on public.saved_searches;
create trigger saved_search_cv_reference before insert or update of track on public.saved_searches
for each row execute function public.validate_cv_template_reference();
drop trigger if exists saved_job_cv_reference on public.job_applications;
create trigger saved_job_cv_reference before insert or update of cv_track, status on public.job_applications
for each row execute function public.validate_cv_template_reference();

notify pgrst, 'reload schema';
commit;
