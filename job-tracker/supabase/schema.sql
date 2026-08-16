-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

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
  extracted_skills jsonb not null default '[]'::jsonb,
  extracted_requirements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table job_applications enable row level security;

create policy "Users read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users read own jobs"
  on job_applications for select using (auth.uid() = user_id);

create policy "Users insert own jobs"
  on job_applications for insert with check (auth.uid() = user_id);

create policy "Users update own jobs"
  on job_applications for update using (auth.uid() = user_id);

create policy "Users delete own jobs"
  on job_applications for delete using (auth.uid() = user_id);

create index if not exists job_applications_user_id_idx on job_applications (user_id);
