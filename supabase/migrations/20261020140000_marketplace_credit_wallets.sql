-- Marketplace wallets. Separate from public.profiles so existing profile
-- selects and update_profile stay unchanged. A missing row means balance 0.
-- Functions insert the row on demand (insert ... on conflict do nothing).
begin;
set local lock_timeout = '10s';

create table public.credit_wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0 and balance <= 1000000),
  updated_at timestamptz not null default now()
);

alter table public.credit_wallets enable row level security;

revoke all on public.credit_wallets from public, anon, authenticated;
grant all on public.credit_wallets to service_role;

commit;
