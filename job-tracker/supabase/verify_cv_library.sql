-- Disposable fixtures only. Every insert/update is rolled back.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  saved_id uuid := gen_random_uuid();
  applied_id uuid := gen_random_uuid();
  search_id uuid := gen_random_uuid();
  original jsonb := '{"version":2,"activeTrack":"custom","cvs":{"custom":{},"replacement":{}},"names":{"custom":"Data","replacement":"General"},"attachments":{"custom":{"fileName":"sample.txt"}}}'::jsonb;
  historical jsonb := '{"summary":"Submitted original"}'::jsonb;
  result jsonb;
  blocked boolean;
begin
  insert into auth.users(id) values (owner_id), (other_id);
  insert into public.master_cvs(user_id, document) values (owner_id, original), (other_id, original);
  insert into public.job_applications(id, user_id, cv_track, status)
    values (saved_id, owner_id, 'custom', 'saved'), (applied_id, owner_id, 'custom', 'applied');
  insert into public.job_applications(user_id, cv_track, status) values (other_id, 'custom', 'saved');
  insert into public.saved_searches(id, user_id, label, query, track) values (search_id, owner_id, 'Data', 'SQL', 'custom');
  insert into public.job_inbox(user_id, external_id, matched_track, saved_search_id)
    values (owner_id, 'cv-library-rollback-fixture', 'custom', search_id);
  insert into public.tailored_documents(user_id, job_application_id, master_cv_snapshot, tailored_cv)
    values (owner_id, applied_id, historical, historical);

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  blocked := false;
  begin perform public.delete_cv_template('custom', 'replacement', original);
  exception when others then blocked := true; end;
  if not blocked then raise exception 'Anonymous deletion was accepted'; end if;
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);

  blocked := false;
  begin perform public.delete_cv_template('custom', null, original);
  exception when others then blocked := true; end;
  if not blocked then raise exception 'Required replacement guard failed'; end if;
  blocked := false;
  begin perform public.delete_cv_template('custom', 'replacement', '{}'::jsonb);
  exception when others then blocked := true; end;
  if not blocked then raise exception 'Stale-document guard failed'; end if;

  result := public.delete_cv_template('custom', 'replacement', original);
  if (result->'cvs') ? 'custom' or result->>'activeTrack' <> 'replacement' then raise exception 'Library deletion failed'; end if;
  if not exists(select 1 from public.job_applications where id = saved_id and cv_track = 'replacement' and needs_rescore and match_score is null) then raise exception 'Saved reassignment failed'; end if;
  if not exists(select 1 from public.saved_searches where id = search_id and track = 'replacement') then raise exception 'Search reassignment failed'; end if;
  if not exists(select 1 from public.job_inbox where user_id = owner_id and matched_track = 'replacement' and match_score = 0) then raise exception 'Inbox invalidation failed'; end if;
  if not exists(select 1 from public.job_applications where id = applied_id and cv_track = 'custom') then raise exception 'Submitted reference changed'; end if;
  if not exists(select 1 from public.tailored_documents where job_application_id = applied_id and master_cv_snapshot = historical and tailored_cv = historical) then raise exception 'Historical document changed'; end if;
  if not exists(select 1 from public.master_cvs where user_id = other_id and document = original) then raise exception 'Other user library changed'; end if;
  if not exists(select 1 from public.job_applications where user_id = other_id and cv_track = 'custom') then raise exception 'Other user job changed'; end if;

  blocked := false;
  begin perform public.delete_cv_template('replacement', null, result);
  exception when others then blocked := true; end;
  if not blocked then raise exception 'Last-template guard failed'; end if;
  blocked := false;
  begin update public.saved_searches set track = 'custom' where id = search_id;
  exception when others then blocked := true; end;
  if not blocked then raise exception 'Stale search reference accepted'; end if;
  blocked := false;
  begin update public.job_applications set cv_track = 'custom' where id = saved_id;
  exception when others then blocked := true; end;
  if not blocked then raise exception 'Stale Saved reference accepted'; end if;
  if has_function_privilege('anon', 'public.delete_cv_template(text,text,jsonb)', 'EXECUTE') then raise exception 'Anonymous execution permission exists'; end if;
  if not has_function_privilege('authenticated', 'public.delete_cv_template(text,text,jsonb)', 'EXECUTE') then raise exception 'Authenticated execution missing'; end if;
end;
$$;
rollback;
select 'PASS: custom IDs, atomic reassignment, ownership, historical documents and deletion guards; all fixtures rolled back' as result;
