-- Read-only; run before identity_profiles. Counts only: do not export PII.
select 'invalid_username' as issue, count(*) as violations
from public.profiles where username is not null and username !~ '^[A-Za-z0-9_]{3,24}$'
union all
select 'duplicate_username_groups', count(*) from (
  select lower(username) from public.profiles where username is not null
  group by lower(username) having count(*) > 1
) duplicates
union all
select 'duplicate_email_groups', count(*) from (
  select lower(email) from public.profiles where email is not null
  group by lower(email) having count(*) > 1
) duplicates
union all
select 'orphan_profile', count(*) from public.profiles p
where not exists (select 1 from auth.users u where u.id = p.id)
union all
select 'missing_username_or_email', count(*) from public.profiles
where username is null or email is null or btrim(email) = ''
union all
select 'invalid_role', count(*) from public.profiles
where role is null or role not in ('admin', 'developer', 'recruiter')
union all
select 'invalid_avatar_or_bio', count(*) from public.profiles
where (avatar_url is not null and avatar_url !~ '^https://') or char_length(bio) > 280
union all
select 'email_out_of_sync', count(*) from public.profiles p join auth.users u on u.id = p.id
where p.email is distinct from u.email
order by issue;
