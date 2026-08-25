-- FitTrack schema. Run in Supabase SQL Editor.
-- Separate project from ApplyTrack.

create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  routine_id uuid references routines on delete cascade not null,
  name text not null default '',
  sets integer not null default 4,
  reps integer not null default 8,
  load_lb numeric,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  day date not null,
  routine_id uuid not null,
  completed_sets jsonb not null default '[]'::jsonb,
  actual_loads jsonb not null default '{}'::jsonb,
  finished boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

create table if not exists weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  day date not null,
  kg numeric not null,
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

alter table routines enable row level security;
alter table exercises enable row level security;
alter table sessions enable row level security;
alter table weight_entries enable row level security;

drop policy if exists "Users read own routines" on routines;
drop policy if exists "Users insert own routines" on routines;
drop policy if exists "Users update own routines" on routines;
drop policy if exists "Users delete own routines" on routines;
create policy "Users read own routines" on routines for select using (auth.uid() = user_id);
create policy "Users insert own routines" on routines for insert with check (auth.uid() = user_id);
create policy "Users update own routines" on routines for update using (auth.uid() = user_id);
create policy "Users delete own routines" on routines for delete using (auth.uid() = user_id);

drop policy if exists "Users read own exercises" on exercises;
drop policy if exists "Users insert own exercises" on exercises;
drop policy if exists "Users update own exercises" on exercises;
drop policy if exists "Users delete own exercises" on exercises;
create policy "Users read own exercises" on exercises for select using (auth.uid() = user_id);
create policy "Users insert own exercises" on exercises for insert with check (auth.uid() = user_id);
create policy "Users update own exercises" on exercises for update using (auth.uid() = user_id);
create policy "Users delete own exercises" on exercises for delete using (auth.uid() = user_id);

drop policy if exists "Users read own sessions" on sessions;
drop policy if exists "Users insert own sessions" on sessions;
drop policy if exists "Users update own sessions" on sessions;
drop policy if exists "Users delete own sessions" on sessions;
create policy "Users read own sessions" on sessions for select using (auth.uid() = user_id);
create policy "Users insert own sessions" on sessions for insert with check (auth.uid() = user_id);
create policy "Users update own sessions" on sessions for update using (auth.uid() = user_id);
create policy "Users delete own sessions" on sessions for delete using (auth.uid() = user_id);

drop policy if exists "Users read own weight entries" on weight_entries;
drop policy if exists "Users insert own weight entries" on weight_entries;
drop policy if exists "Users update own weight entries" on weight_entries;
drop policy if exists "Users delete own weight entries" on weight_entries;
create policy "Users read own weight entries" on weight_entries for select using (auth.uid() = user_id);
create policy "Users insert own weight entries" on weight_entries for insert with check (auth.uid() = user_id);
create policy "Users update own weight entries" on weight_entries for update using (auth.uid() = user_id);
create policy "Users delete own weight entries" on weight_entries for delete using (auth.uid() = user_id);

create index if not exists routines_user_id_idx on routines (user_id);
create index if not exists exercises_user_routine_idx on exercises (user_id, routine_id);
create index if not exists sessions_user_day_idx on sessions (user_id, day);

alter table sessions add column if not exists actual_loads jsonb not null default '{}'::jsonb;
alter table sessions add column if not exists finished boolean not null default false;
create index if not exists weight_entries_user_day_idx on weight_entries (user_id, day);

create table if not exists week_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  monday date not null,
  goal integer not null default 0,
  unique (user_id, monday)
);

alter table week_goals enable row level security;

drop policy if exists "Users read own week goals" on week_goals;
drop policy if exists "Users insert own week goals" on week_goals;
drop policy if exists "Users update own week goals" on week_goals;
drop policy if exists "Users delete own week goals" on week_goals;
create policy "Users read own week goals" on week_goals for select using (auth.uid() = user_id);
create policy "Users insert own week goals" on week_goals for insert with check (auth.uid() = user_id);
create policy "Users update own week goals" on week_goals for update using (auth.uid() = user_id);
create policy "Users delete own week goals" on week_goals for delete using (auth.uid() = user_id);

create index if not exists week_goals_user_monday_idx on week_goals (user_id, monday);
