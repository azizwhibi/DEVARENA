-- DEV-PROJECT BASELINE ONLY.
-- Mirrors the Skills & Progression tables described in USER-MODULE-DEVELOPER-GUIDE.md §5
-- so the identity migrations have something real to alter in a fresh Supabase project.
-- Do NOT apply to the shared project: those tables already exist there (everything is
-- `if not exists`, so an accidental run is a no-op, but still skip it).

create table if not exists public.profiles (
  id uuid primary key,
  email text,
  username text,
  role text default 'developer',
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists public.technologies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  technology_id uuid references public.technologies (id),
  is_active boolean not null default true
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced', 'expert')),
  duration_seconds int
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  challenge_id uuid not null references public.challenges (id),
  accuracy numeric not null check (accuracy between 0 and 1),
  is_validated boolean not null default false,
  submitted_code text,
  metadata jsonb,
  duration_ms int,
  created_at timestamptz not null default now()
);

create table if not exists public.user_skill_progress (
  user_id uuid not null references public.profiles (id),
  skill_id uuid not null references public.skills (id),
  level_score numeric not null default 0 check (level_score between 0 and 100),
  validated_attempts int not null default 0,
  status text not null default 'not_evaluated',
  scoring_version text,
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create table if not exists public.user_skill_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  skill_id uuid not null references public.skills (id),
  level_score numeric not null,
  validated_attempts int not null,
  recorded_at timestamptz not null default now()
);

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  content jsonb not null,
  created_at timestamptz not null default now()
);

-- The anon key is public: no table is readable through PostgREST unless a policy says so.
alter table public.profiles enable row level security;
alter table public.technologies enable row level security;
alter table public.skills enable row level security;
alter table public.challenges enable row level security;
alter table public.attempts enable row level security;
alter table public.user_skill_progress enable row level security;
alter table public.user_skill_history enable row level security;
alter table public.ai_recommendations enable row level security;
