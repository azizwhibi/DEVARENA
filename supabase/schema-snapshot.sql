-- T1 SOURCE: actual dedicated Supabase DEV project qorlygdcfwnrrzvzulcz.
-- Captured 2026-10-18 through MCP catalog inspection, after baseline, before T2/T3.
-- Public table columns/defaults/constraints, foreign keys and RLS flags.
-- Inspection artifact only. NOT a migration or a shared/production snapshot.
-- Attempt payload columns: submitted_code, metadata.

create table public.ai_recommendations (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  content jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint ai_recommendations_pkey PRIMARY KEY (id)
);
alter table public.ai_recommendations enable row level security;

create table public.attempts (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  challenge_id uuid not null,
  accuracy numeric not null,
  is_validated boolean default false not null,
  submitted_code text,
  metadata jsonb,
  duration_ms integer,
  created_at timestamp with time zone default now() not null,
  constraint attempts_accuracy_check CHECK (((accuracy >= (0)::numeric) AND (accuracy <= (1)::numeric))),
  constraint attempts_pkey PRIMARY KEY (id)
);
alter table public.attempts enable row level security;

create table public.challenges (
  id uuid default gen_random_uuid() not null,
  title text not null,
  difficulty text not null,
  duration_seconds integer,
  constraint challenges_difficulty_check CHECK ((difficulty = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text, 'expert'::text]))),
  constraint challenges_pkey PRIMARY KEY (id)
);
alter table public.challenges enable row level security;

create table public.profiles (
  id uuid not null,
  email text,
  username text,
  role text default 'developer'::text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default now() not null,
  constraint profiles_pkey PRIMARY KEY (id)
);
alter table public.profiles enable row level security;

create table public.skills (
  id uuid default gen_random_uuid() not null,
  name text not null,
  technology_id uuid,
  is_active boolean default true not null,
  constraint skills_pkey PRIMARY KEY (id)
);
alter table public.skills enable row level security;

create table public.technologies (
  id uuid default gen_random_uuid() not null,
  name text not null,
  is_active boolean default true not null,
  constraint technologies_name_key UNIQUE (name),
  constraint technologies_pkey PRIMARY KEY (id)
);
alter table public.technologies enable row level security;

create table public.user_skill_history (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  skill_id uuid not null,
  level_score numeric not null,
  validated_attempts integer not null,
  recorded_at timestamp with time zone default now() not null,
  constraint user_skill_history_pkey PRIMARY KEY (id)
);
alter table public.user_skill_history enable row level security;

create table public.user_skill_progress (
  user_id uuid not null,
  skill_id uuid not null,
  level_score numeric default 0 not null,
  validated_attempts integer default 0 not null,
  status text default 'not_evaluated'::text not null,
  scoring_version text,
  updated_at timestamp with time zone default now() not null,
  constraint user_skill_progress_level_score_check CHECK (((level_score >= (0)::numeric) AND (level_score <= (100)::numeric))),
  constraint user_skill_progress_pkey PRIMARY KEY (user_id, skill_id)
);
alter table public.user_skill_progress enable row level security;

alter table public.ai_recommendations add constraint ai_recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
alter table public.attempts add constraint attempts_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES challenges(id);
alter table public.attempts add constraint attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
alter table public.skills add constraint skills_technology_id_fkey FOREIGN KEY (technology_id) REFERENCES technologies(id);
alter table public.user_skill_history add constraint user_skill_history_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id);
alter table public.user_skill_history add constraint user_skill_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
alter table public.user_skill_progress add constraint user_skill_progress_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES skills(id);
alter table public.user_skill_progress add constraint user_skill_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
