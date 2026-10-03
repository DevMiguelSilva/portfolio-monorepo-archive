-- Run in the production Supabase SQL Editor after the migration.
-- Only a newly inserted synthetic job is changed; everything rolls back.
-- This verifies database writes, not browser authentication or UI reloads.
begin;

do $$
declare
  test_job_id uuid := gen_random_uuid();
  test_owner_id uuid;
  round_id uuid := gen_random_uuid();
  stored public.job_applications%rowtype;
begin
  select id into test_owner_id from auth.users limit 1;
  if test_owner_id is null then
    raise exception 'Verification requires an existing authenticated user';
  end if;

  insert into public.job_applications (id, user_id, company, role)
  values (test_job_id, test_owner_id, 'ApplyTrack verification only', 'Synthetic test job');

  select * into strict stored from public.job_applications where id = test_job_id;
  if stored.not_selected is distinct from false or stored.needs_rescore is distinct from false then
    raise exception 'Flag defaults failed';
  end if;

  update public.job_applications set match_score = 71, needs_rescore = false where id = test_job_id;
  select * into strict stored from public.job_applications where id = test_job_id;
  if stored.match_score is distinct from 71 then raise exception 'Gap-score save failed'; end if;

  update public.job_applications
  set interviews = jsonb_build_array(jsonb_build_object('id', round_id, 'label', 'Screen', 'date', '2026-10-04', 'done', false))
  where id = test_job_id;
  select * into strict stored from public.job_applications where id = test_job_id;
  if stored.interviews->0->>'label' is distinct from 'Screen' then raise exception 'Interview creation failed'; end if;

  update public.job_applications
  set interviews = jsonb_set(interviews, '{0,label}', '"Technical"'::jsonb)
  where id = test_job_id;
  select * into strict stored from public.job_applications where id = test_job_id;
  if stored.interviews->0->>'label' is distinct from 'Technical' then raise exception 'Interview edit failed'; end if;

  update public.job_applications set interviews = jsonb_set(interviews, '{0,done}', 'true'::jsonb) where id = test_job_id;
  select * into strict stored from public.job_applications where id = test_job_id;
  if stored.interviews->0->>'done' is distinct from 'true' then raise exception 'Interview completion failed'; end if;

  update public.job_applications set status = 'offer' where id = test_job_id;
  select * into strict stored from public.job_applications where id = test_job_id;
  if stored.status is distinct from 'offer' then raise exception 'Offer outcome failed'; end if;

  update public.job_applications set status = 'rejected' where id = test_job_id;
  select * into strict stored from public.job_applications where id = test_job_id;
  if stored.status is distinct from 'rejected' then raise exception 'Rejected outcome failed'; end if;

  update public.job_applications set status = 'interview', not_selected = true, needs_rescore = true where id = test_job_id;
  select * into strict stored from public.job_applications where id = test_job_id;
  if stored.not_selected is distinct from true or stored.needs_rescore is distinct from true then
    raise exception 'Not-selected and rescore flag save failed';
  end if;
end $$;

rollback;
select 'PASS: job save fields and outcomes verified; synthetic row rolled back' as verification;
