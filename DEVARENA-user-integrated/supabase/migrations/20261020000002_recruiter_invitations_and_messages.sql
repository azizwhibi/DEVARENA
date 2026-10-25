-- Migration: 20261020000002_recruiter_invitations_and_messages.sql
-- Recruiter interview invitations, conversations, and real-time messaging tables with strict RLS

begin;
set local lock_timeout = '10s';

-- 1. Invitations table
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  message text check (message is null or (char_length(btrim(message)) > 0 and char_length(message) <= 1000)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_different_users check (recruiter_id <> candidate_id),
  constraint uq_recruiter_candidate unique (recruiter_id, candidate_id)
);

create index if not exists idx_invitations_candidate on public.invitations (candidate_id, status);
create index if not exists idx_invitations_recruiter on public.invitations (recruiter_id, status);

alter table public.invitations enable row level security;
revoke all on public.invitations from public, anon, authenticated;
grant select on public.invitations to authenticated;
grant all on public.invitations to service_role;

do $$
declare pol record;
begin
  for pol in select policyname from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'invitations'
  loop
    execute format('drop policy %I on public.invitations', pol.policyname);
  end loop;
end;
$$;

create policy select_own_invitations on public.invitations for select to authenticated
  using (recruiter_id = (select auth.uid()) or candidate_id = (select auth.uid()) or (select private.is_admin()));

-- 2. Conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique references public.invitations(id) on delete cascade,
  participant_one_id uuid not null references public.profiles(id) on delete cascade,
  participant_two_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_different_participants check (participant_one_id <> participant_two_id)
);

create index if not exists idx_conversations_p1 on public.conversations (participant_one_id);
create index if not exists idx_conversations_p2 on public.conversations (participant_two_id);

alter table public.conversations enable row level security;
revoke all on public.conversations from public, anon, authenticated;
grant select on public.conversations to authenticated;
grant all on public.conversations to service_role;

do $$
declare pol record;
begin
  for pol in select policyname from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'conversations'
  loop
    execute format('drop policy %I on public.conversations', pol.policyname);
  end loop;
end;
$$;

create policy select_own_conversations on public.conversations for select to authenticated
  using (participant_one_id = (select auth.uid()) or participant_two_id = (select auth.uid()) or (select private.is_admin()));

-- 3. Messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(btrim(content)) > 0 and char_length(content) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages (conversation_id, created_at asc);

alter table public.messages enable row level security;
revoke all on public.messages from public, anon, authenticated;
grant select on public.messages to authenticated;
grant all on public.messages to service_role;

do $$
declare pol record;
begin
  for pol in select policyname from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'messages'
  loop
    execute format('drop policy %I on public.messages', pol.policyname);
  end loop;
end;
$$;

create policy select_own_messages on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.participant_one_id = (select auth.uid()) or c.participant_two_id = (select auth.uid()))
    )
    or (select private.is_admin())
  );

commit;
