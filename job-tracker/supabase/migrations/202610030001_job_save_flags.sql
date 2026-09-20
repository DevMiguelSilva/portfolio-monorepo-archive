-- Repair cloud job saves without replacing any application records.
-- Safe to run again in the production project's Supabase SQL Editor.
begin;

alter table public.job_applications
  add column if not exists not_selected boolean not null default false,
  add column if not exists needs_rescore boolean not null default false;

-- Refresh PostgREST's cached table definition after the transaction commits.
notify pgrst, 'reload schema';

commit;
