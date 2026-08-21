-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ApplyTrack v2 schema (safe to re-run)

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  headline text not null default '',
  skills text not null default '',
  experience_summary text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  company text not null default '',
  role text not null default '',
  location text not null default '',
  job_url text not null default '',
  salary text not null default '',
  status text not null default 'saved' check (status in ('saved', 'applied', 'interview', 'offer', 'rejected')),
  applied_date text not null default '',
  notes text not null default '',
  job_description text not null default '',
  jd_summary text not null default '',
  extracted_skills jsonb not null default '[]'::jsonb,
  extracted_requirements jsonb not null default '[]'::jsonb,
  source text not null default 'manual',
  external_id text not null default '',
  match_score integer,
  jd_complete boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- v2 columns for existing installs
alter table job_applications add column if not exists source text not null default 'manual';
alter table job_applications add column if not exists external_id text not null default '';
alter table job_applications add column if not exists match_score integer;
alter table job_applications add column if not exists jd_summary text not null default '';
alter table job_applications add column if not exists jd_complete boolean;
update job_applications
set jd_complete = (coalesce(source, 'manual') = 'manual')
where jd_complete is null;
alter table job_applications alter column jd_complete set default true;
update job_applications set jd_complete = true where jd_complete is null;
alter table job_applications alter column jd_complete set not null;
alter table job_applications add column if not exists deleted_at timestamptz;

create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  label text not null default '',
  query text not null default '',
  location text not null default '',
  country text not null default 'ca',
  max_days_old integer not null default 7,
  exclude_terms text not null default '',
  track text not null default 'auto' check (track in ('auto', 'frontend', 'powerPlatform')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table saved_searches add column if not exists track text not null default 'auto';
alter table job_applications add column if not exists cv_track text;
alter table job_inbox add column if not exists matched_track text;

create table if not exists job_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  external_id text not null,
  source text not null default 'adzuna',
  company text not null default '',
  role text not null default '',
  location text not null default '',
  job_url text not null default '',
  salary text not null default '',
  description text not null default '',
  match_score integer not null default 0,
  match_reasons jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (status in ('new', 'approved', 'dismissed')),
  saved_search_id uuid references saved_searches on delete set null,
  seen_count integer not null default 1,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_id)
);

alter table job_inbox add column if not exists seen_count integer;
update job_inbox set seen_count = 1 where seen_count is null;
alter table job_inbox alter column seen_count set default 1;
update job_inbox set seen_count = 1 where seen_count is null;
alter table job_inbox alter column seen_count set not null;

create table if not exists master_cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null unique,
  document jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists tailored_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  job_application_id uuid references job_applications on delete cascade not null,
  master_cv_snapshot jsonb not null default '{}'::jsonb,
  tailored_cv jsonb not null default '{}'::jsonb,
  cover_letter text not null default '',
  gap_report jsonb not null default '{}'::jsonb,
  match_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_application_id)
);

alter table profiles enable row level security;
alter table job_applications enable row level security;
alter table saved_searches enable row level security;
alter table job_inbox enable row level security;
alter table master_cvs enable row level security;
alter table tailored_documents enable row level security;

-- Profiles policies
drop policy if exists "Users read own profile" on profiles;
drop policy if exists "Users insert own profile" on profiles;
drop policy if exists "Users update own profile" on profiles;
create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

-- Job applications policies
drop policy if exists "Users read own jobs" on job_applications;
drop policy if exists "Users insert own jobs" on job_applications;
drop policy if exists "Users update own jobs" on job_applications;
drop policy if exists "Users delete own jobs" on job_applications;
create policy "Users read own jobs" on job_applications for select using (auth.uid() = user_id);
create policy "Users insert own jobs" on job_applications for insert with check (auth.uid() = user_id);
create policy "Users update own jobs" on job_applications for update using (auth.uid() = user_id);
create policy "Users delete own jobs" on job_applications for delete using (auth.uid() = user_id);

-- Saved searches policies
drop policy if exists "Users read own searches" on saved_searches;
drop policy if exists "Users insert own searches" on saved_searches;
drop policy if exists "Users update own searches" on saved_searches;
drop policy if exists "Users delete own searches" on saved_searches;
create policy "Users read own searches" on saved_searches for select using (auth.uid() = user_id);
create policy "Users insert own searches" on saved_searches for insert with check (auth.uid() = user_id);
create policy "Users update own searches" on saved_searches for update using (auth.uid() = user_id);
create policy "Users delete own searches" on saved_searches for delete using (auth.uid() = user_id);

-- Inbox policies
drop policy if exists "Users read own inbox" on job_inbox;
drop policy if exists "Users insert own inbox" on job_inbox;
drop policy if exists "Users update own inbox" on job_inbox;
drop policy if exists "Users delete own inbox" on job_inbox;
create policy "Users read own inbox" on job_inbox for select using (auth.uid() = user_id);
create policy "Users insert own inbox" on job_inbox for insert with check (auth.uid() = user_id);
create policy "Users update own inbox" on job_inbox for update using (auth.uid() = user_id);
create policy "Users delete own inbox" on job_inbox for delete using (auth.uid() = user_id);

-- Master CV policies
drop policy if exists "Users read own master cv" on master_cvs;
drop policy if exists "Users insert own master cv" on master_cvs;
drop policy if exists "Users update own master cv" on master_cvs;
create policy "Users read own master cv" on master_cvs for select using (auth.uid() = user_id);
create policy "Users insert own master cv" on master_cvs for insert with check (auth.uid() = user_id);
create policy "Users update own master cv" on master_cvs for update using (auth.uid() = user_id);

-- Tailored documents policies
drop policy if exists "Users read own tailored docs" on tailored_documents;
drop policy if exists "Users insert own tailored docs" on tailored_documents;
drop policy if exists "Users update own tailored docs" on tailored_documents;
drop policy if exists "Users delete own tailored docs" on tailored_documents;
create policy "Users read own tailored docs" on tailored_documents for select using (auth.uid() = user_id);
create policy "Users insert own tailored docs" on tailored_documents for insert with check (auth.uid() = user_id);
create policy "Users update own tailored docs" on tailored_documents for update using (auth.uid() = user_id);
create policy "Users delete own tailored docs" on tailored_documents for delete using (auth.uid() = user_id);

create table if not exists portal_feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null default '',
  url text not null default '',
  source text not null default 'other' check (source in ('indeed', 'ziprecruiter', 'linkedin', 'other')),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists hunt_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  day date not null,
  checked_feed_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

alter table portal_feeds enable row level security;
alter table hunt_days enable row level security;

drop policy if exists "Users read own portal feeds" on portal_feeds;
drop policy if exists "Users insert own portal feeds" on portal_feeds;
drop policy if exists "Users update own portal feeds" on portal_feeds;
drop policy if exists "Users delete own portal feeds" on portal_feeds;
create policy "Users read own portal feeds" on portal_feeds for select using (auth.uid() = user_id);
create policy "Users insert own portal feeds" on portal_feeds for insert with check (auth.uid() = user_id);
create policy "Users update own portal feeds" on portal_feeds for update using (auth.uid() = user_id);
create policy "Users delete own portal feeds" on portal_feeds for delete using (auth.uid() = user_id);

drop policy if exists "Users read own hunt days" on hunt_days;
drop policy if exists "Users insert own hunt days" on hunt_days;
drop policy if exists "Users update own hunt days" on hunt_days;
drop policy if exists "Users delete own hunt days" on hunt_days;
create policy "Users read own hunt days" on hunt_days for select using (auth.uid() = user_id);
create policy "Users insert own hunt days" on hunt_days for insert with check (auth.uid() = user_id);
create policy "Users update own hunt days" on hunt_days for update using (auth.uid() = user_id);
create policy "Users delete own hunt days" on hunt_days for delete using (auth.uid() = user_id);

create index if not exists job_applications_user_id_idx on job_applications (user_id);
create index if not exists saved_searches_user_id_idx on saved_searches (user_id);
create index if not exists job_inbox_user_id_status_idx on job_inbox (user_id, status);
create index if not exists tailored_documents_job_idx on tailored_documents (job_application_id);
create index if not exists portal_feeds_user_id_idx on portal_feeds (user_id);
create index if not exists hunt_days_user_day_idx on hunt_days (user_id, day);
