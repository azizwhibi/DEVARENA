-- T3. Baseline payload columns: submitted_code and metadata.
-- Shared-project rollout MUST first inspect its live payload columns and foreign keys.
begin;
set local lock_timeout = '10s';

do $$
declare relation_name text; fk record;
begin
  foreach relation_name in array array['attempts', 'user_skill_progress', 'user_skill_history', 'ai_recommendations']
  loop
    for fk in
      select c.conname from pg_catalog.pg_constraint c
      join pg_catalog.pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
      where c.conrelid = format('public.%I', relation_name)::regclass
        and c.contype = 'f' and a.attname = 'user_id'
    loop
      execute format('alter table public.%I drop constraint %I', relation_name, fk.conname);
    end loop;
    if relation_name = 'attempts' then
      alter table public.attempts alter column user_id drop not null;
      alter table public.attempts alter column submitted_code drop not null;
      alter table public.attempts alter column metadata drop not null;
      alter table public.attempts add constraint attempts_user_id_fkey
        foreign key (user_id) references public.profiles(id) on delete set null;
    else
      execute format('alter table public.%I add constraint %I foreign key (user_id) references public.profiles(id) on delete cascade',
        relation_name, relation_name || '_user_id_fkey');
    end if;
  end loop;
end;
$$;
-- Avoid scanning entire histories while holding the profile deletion lock.
create index if not exists attempts_user_id_idx on public.attempts(user_id);
create index if not exists user_skill_history_user_id_idx on public.user_skill_history(user_id);
create index if not exists ai_recommendations_user_id_idx on public.ai_recommendations(user_id);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  target_id uuid,
  action text not null,
  "before" jsonb,
  "after" jsonb,
  created_at timestamptz not null default now()
);
comment on table public.audit_log is
  'UUID references deliberately have no FK. RPC writers must omit email, username and other PII.';
alter table public.audit_log enable row level security;
revoke all on public.audit_log from public, anon, authenticated;
grant all on public.audit_log to service_role;
do $$
declare policy record;
begin
  for policy in select policyname from pg_catalog.pg_policies
    where schemaname = 'public' and tablename = 'audit_log'
  loop execute format('drop policy %I on public.audit_log', policy.policyname); end loop;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public URLs serve public-bucket objects without granting SQL access to their metadata.
-- SELECT on one's own folder is necessary for listing and upsert through Storage.
drop policy if exists avatars_select_own on storage.objects;
drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists avatars_delete_own on storage.objects;
drop policy if exists avatars_owner_boundary on storage.objects;
create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Restrictive boundary prevents another bucket's broad permissive policy from opening avatars.
create policy avatars_owner_boundary on storage.objects as restrictive for all to anon, authenticated
  using (bucket_id <> 'avatars' or (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id <> 'avatars' or (storage.foldername(name))[1] = (select auth.uid())::text);

create or replace function public.scrub_profile_attempts() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Removing storage.objects rows in SQL would orphan physical blobs. Fail closed:
  -- AccountService must delete files with Storage API before auth.admin.deleteUser.
  -- This guard also covers direct SQL/dashboard deletions and legacy unowned uploads.
  if exists (select 1 from storage.objects
    where bucket_id = 'avatars' and (storage.foldername(name))[1] = old.id::text) then
    raise exception using errcode = '23503',
      message = 'Remove avatar files with the Storage API before deleting the account.';
  end if;
  update public.attempts set submitted_code = null, metadata = null where user_id = old.id;
  return old;
end;
$$;
revoke all on function public.scrub_profile_attempts() from public, anon, authenticated;
grant execute on function public.scrub_profile_attempts() to service_role;
drop trigger if exists profiles_scrub_attempts on public.profiles;
create trigger profiles_scrub_attempts before delete on public.profiles
  for each row execute function public.scrub_profile_attempts();

commit;
