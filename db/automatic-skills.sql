-- Run after skills-integration.sql. Replay-safe; no scores or history are rewritten.
begin;
set local lock_timeout = '10s';

create index if not exists attempts_validated_user_problem
  on public.attempts(user_id, challenge_id) where is_validated = true;

-- Distinct problems prevent repeat submissions from inflating skill counts.
create or replace view public.developer_demonstrated_skills
with (security_barrier = true) as
with demonstrated as (
  select a.user_id, cs.skill_id,
    count(distinct a.challenge_id)::integer as solved_count,
    min(a.created_at) as first_validated_at
  from public.attempts a
  join public.challenge_skills cs on cs.challenge_id = a.challenge_id
  join public.profiles p on p.id = a.user_id and p.role = 'developer'
  where a.is_validated = true
  group by a.user_id, cs.skill_id
)
select d.user_id, s.id, s.name, s.slug, s.description, s.is_active,
  case when c.id is not null then jsonb_build_object('id', c.id, 'name', c.name) end as category,
  case when t.id is not null then jsonb_build_object('id', t.id, 'name', t.name) end as technology,
  d.solved_count, d.first_validated_at
from demonstrated d
join public.skills s on s.id = d.skill_id
left join public.skill_categories c on c.id = s.category_id
left join public.technologies t on t.id = s.technology_id;

-- Only the authenticated backend may read this owner-privileged view.
revoke all on public.developer_demonstrated_skills from public, anon, authenticated;
grant select on public.developer_demonstrated_skills to service_role;
comment on view public.developer_demonstrated_skills is
  'Skills demonstrated through trusted validated problem results; independent of training assignments and learning completion.';

notify pgrst, 'reload schema';
commit;
