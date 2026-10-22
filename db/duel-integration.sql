-- Habib's battle result table, adapted to the existing host identities.
-- No user-management migrations, profile XP, credits, or proficiency updates.
begin;
set local lock_timeout = '10s';
create table if not exists public.duel_matches (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid references public.profiles(id) on delete set null,
  player2_id uuid references public.profiles(id) on delete set null,
  player1_score integer not null default 0 check (player1_score >= 0),
  player2_score integer not null default 0 check (player2_score >= 0),
  winner_id uuid references public.profiles(id) on delete set null,
  rounds_data jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_duel_matches_player1 on public.duel_matches(player1_id);
create index if not exists idx_duel_matches_player2 on public.duel_matches(player2_id);
create index if not exists idx_duel_matches_created_at on public.duel_matches(created_at desc);
alter table public.duel_matches enable row level security;
revoke all on public.duel_matches from public, anon, authenticated;
grant all on public.duel_matches to service_role;
-- Existing source policies cannot grant access without the table privileges.
-- Preserve them and existing records when integrating an already deployed table.
comment on table public.duel_matches is 'Battle Code quiz results. Separate from verified skill proficiency and Marketplace balances.';
commit;
