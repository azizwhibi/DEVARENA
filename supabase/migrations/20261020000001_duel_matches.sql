-- Migration: 20261020000001_duel_matches.sql
-- Table des matchs de duel 1v1 multijoueur synchrone & persistance XP
begin;
set local lock_timeout = '10s';

-- 1. Ajout de la colonne XP dans profiles si absente
alter table public.profiles
  add column if not exists xp integer not null default 0;

-- 2. Création de la table duel_matches
create table if not exists public.duel_matches (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid references public.profiles(id) on delete set null,
  player2_id uuid references public.profiles(id) on delete set null,
  player1_score integer not null default 0,
  player2_score integer not null default 0,
  winner_id uuid references public.profiles(id) on delete set null,
  rounds_data jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Index pour optimiser les requêtes d'historique de matchs
create index if not exists idx_duel_matches_player1 on public.duel_matches(player1_id);
create index if not exists idx_duel_matches_player2 on public.duel_matches(player2_id);
create index if not exists idx_duel_matches_created_at on public.duel_matches(created_at desc);

-- 3. Configuration Row Level Security (RLS)
alter table public.duel_matches enable row level security;

revoke all on public.duel_matches from public, anon, authenticated;
grant select on public.duel_matches to anon, authenticated;
grant all on public.duel_matches to service_role;

-- Suppression préventive d'anciennes politiques si re-exécuté
do $$
declare pol record;
begin
  for pol in select policyname from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'duel_matches'
  loop
    execute format('drop policy %I on public.duel_matches', pol.policyname);
  end loop;
end;
$$;

-- Lecture publique pour l'historique et les résumés de matchs
create policy duel_matches_select on public.duel_matches
  for select to anon, authenticated
  using (true);

-- Insertion et modifications strictement réservées au service_role (Backend NestJS)
create policy duel_matches_service on public.duel_matches
  for all to service_role
  using (true)
  with check (true);

commit;
