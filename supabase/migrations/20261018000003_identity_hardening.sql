-- T3a: accepted SEC-04/SEC-05 hardening. Never alters default privileges.
begin;
set local lock_timeout = '10s';

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
  for attempt in 1..10 loop
    insert into public.profiles (id, email, username, role, status, avatar_url, visibility)
    values (new.id, new.email, candidate, 'developer', 'active', avatar, profile_visibility)
    on conflict (lower(username)) do nothing returning id into inserted_id;
    if inserted_id is not null then return new; end if;
    -- ON CONFLICT also handles concurrent signups; random attempts are bounded.
    candidate := left(base_username, 19) || '_' || left(replace(gen_random_uuid()::text, '-', ''), 4);
  end loop;
  candidate := 'user_' || left(replace(new.id::text, '-', ''), 19);
  insert into public.profiles (id, email, username, role, status, avatar_url, visibility)
  values (new.id, new.email, candidate, 'developer', 'active', avatar, profile_visibility);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

revoke all on public.technologies, public.skills, public.challenges, public.attempts,
  public.user_skill_progress, public.user_skill_history, public.ai_recommendations
  from public, anon, authenticated;
grant all on public.technologies, public.skills, public.challenges, public.attempts,
  public.user_skill_progress, public.user_skill_history, public.ai_recommendations
  to service_role;

commit;
