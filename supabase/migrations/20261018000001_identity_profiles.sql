-- T2. Apply only after precheck.sql and review of the target schema.
-- Incompatible existing data aborts the transaction; no PII is silently rewritten.
begin;
set local lock_timeout = '10s';

do $$
begin
  if exists (
    select 1 from public.profiles p left join auth.users u on u.id = p.id
    where u.id is null or p.email is null or btrim(p.email) = ''
      or p.email is distinct from u.email
      or p.username is null or p.username !~ '^[A-Za-z0-9_]{3,24}$'
      or p.role is null or p.role not in ('admin', 'developer', 'recruiter')
      or (p.avatar_url is not null and p.avatar_url !~ '^https://')
      or char_length(p.bio) > 280
  ) or exists (
    select lower(username) from public.profiles group by lower(username) having count(*) > 1
  ) or exists (
    select lower(email) from public.profiles group by lower(email) having count(*) > 1
  ) then
    raise exception 'Identity precheck failed. Review supabase/precheck.sql and resolve violations before retrying.';
  end if;
end;
$$;

alter table public.profiles
  add column if not exists status text not null default 'active',
  add column if not exists country char(2),
  add column if not exists institution text,
  add column if not exists institution_key text generated always as
    (upper(regexp_replace(btrim(institution), '\s+', ' ', 'g'))) stored,
  add column if not exists visibility text not null default 'public',
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles
  alter column email set not null,
  alter column username set not null,
  alter column role set default 'developer',
  alter column role set not null,
  alter column status set default 'active',
  alter column status set not null,
  alter column visibility set default 'public',
  alter column visibility set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

-- Replace only these owned constraints; repeat execution preserves rows and values.
alter table public.profiles
  drop constraint if exists profiles_username_check,
  drop constraint if exists profiles_email_check,
  drop constraint if exists profiles_role_check,
  drop constraint if exists profiles_status_check,
  drop constraint if exists profiles_avatar_url_check,
  drop constraint if exists profiles_bio_check,
  drop constraint if exists profiles_country_check,
  drop constraint if exists profiles_institution_check,
  drop constraint if exists profiles_visibility_check;
alter table public.profiles
  add constraint profiles_username_check check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  add constraint profiles_email_check check (btrim(email) <> ''),
  add constraint profiles_role_check check (role in ('admin', 'developer', 'recruiter')),
  add constraint profiles_status_check check (status in ('active', 'suspended')),
  add constraint profiles_avatar_url_check check (avatar_url ~ '^https://'),
  add constraint profiles_bio_check check (char_length(bio) <= 280),
  add constraint profiles_country_check check (country ~ '^[A-Z]{2}$'),
  add constraint profiles_institution_check check (char_length(institution) <= 120),
  add constraint profiles_visibility_check check (visibility in ('public', 'private'));
create unique index if not exists profiles_username_lower_uidx on public.profiles (lower(username));
create unique index if not exists profiles_email_lower_uidx on public.profiles (lower(email));

-- Discover existing FK names rather than assuming the shared schema's names.
do $$
declare fk record;
begin
  for fk in
    select c.conname from pg_catalog.pg_constraint c
    join pg_catalog.pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conrelid = 'public.profiles'::regclass and c.contype = 'f' and a.attname = 'id'
  loop
    execute format('alter table public.profiles drop constraint %I', fk.conname);
  end loop;
end;
$$;
alter table public.profiles add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid())
      and role = 'admin' and status = 'active'
  );
$$;
revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated, service_role;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  candidate text;
  base_username text;
  avatar text;
  profile_visibility text;
  inserted_id uuid;
begin
  -- Metadata is untrusted, including its JSON types. Never use the email local part.
  base_username := coalesce(
    case when jsonb_typeof(new.raw_user_meta_data -> 'username') = 'string'
      then nullif(btrim(new.raw_user_meta_data ->> 'username'), '') end,
    case when jsonb_typeof(new.raw_user_meta_data -> 'user_name') = 'string'
      then nullif(btrim(new.raw_user_meta_data ->> 'user_name'), '') end,
    case when jsonb_typeof(new.raw_user_meta_data -> 'preferred_username') = 'string'
      then nullif(btrim(new.raw_user_meta_data ->> 'preferred_username'), '') end,
    'user_' || left(new.id::text, 8)
  );
  base_username := left(regexp_replace(base_username, '[^A-Za-z0-9_]', '', 'g'), 24);
  if char_length(base_username) < 3 then
    base_username := 'user_' || left(new.id::text, 8);
  end if;
  avatar := coalesce(
    case when jsonb_typeof(new.raw_user_meta_data -> 'avatar_url') = 'string'
      and (new.raw_user_meta_data ->> 'avatar_url') ~ '^https://'
      then new.raw_user_meta_data ->> 'avatar_url' end,
    case when jsonb_typeof(new.raw_user_meta_data -> 'picture') = 'string'
      and (new.raw_user_meta_data ->> 'picture') ~ '^https://'
      then new.raw_user_meta_data ->> 'picture' end
  );
  profile_visibility := case when new.raw_user_meta_data ->> 'visibility' in ('public', 'private')
    then new.raw_user_meta_data ->> 'visibility' else 'public' end;
  candidate := base_username;
  loop
    insert into public.profiles (id, email, username, role, status, avatar_url, visibility)
    values (new.id, new.email, candidate, 'developer', 'active', avatar, profile_visibility)
    on conflict (lower(username)) do nothing returning id into inserted_id;
    exit when inserted_id is not null;
    -- ON CONFLICT handles concurrent signups as well as existing collisions.
    candidate := left(base_username, 19) || '_' || left(replace(gen_random_uuid()::text, '-', ''), 4);
  end loop;
  return new;
end;
$$;

create or replace function public.handle_auth_user_email_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create or replace function public.set_profile_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.handle_new_user(), public.handle_auth_user_email_changed(),
  public.set_profile_updated_at() from public, anon, authenticated;
grant execute on function public.handle_new_user(), public.handle_auth_user_email_changed(),
  public.set_profile_updated_at() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_auth_user_email_changed();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_profile_updated_at();

revoke all on public.profiles from public, anon, authenticated;
grant select (id, username, avatar_url, bio, country, institution, visibility, role, created_at)
  on public.profiles to anon, authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
-- Old permissive policies would OR with the new policies and leak private rows.
do $$
declare policy record;
begin
  for policy in select policyname from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy %I on public.profiles', policy.policyname);
  end loop;
end;
$$;
create policy select_public on public.profiles for select to anon, authenticated
  using (visibility = 'public' and status = 'active');
create policy select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy select_admin on public.profiles for select to authenticated
  using ((select private.is_admin()));

commit;
