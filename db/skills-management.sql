-- Run after skills-integration.sql. Additive; no accounts or scores are fabricated.
begin;
set local lock_timeout='10s';
create unique index if not exists skills_management_name on public.skills(lower(btrim(name)));
create unique index if not exists technologies_management_name on public.technologies(lower(btrim(name)));
create table if not exists public.user_skill_assignments(
 user_id uuid not null references public.profiles(id) on delete cascade,
 skill_id uuid not null references public.skills(id) on delete restrict,
 is_active boolean not null default true,
 assigned_by uuid references public.profiles(id) on delete set null,
 assigned_at timestamptz not null default now(),
 primary key(user_id,skill_id)
);
alter table public.user_skill_assignments enable row level security;
revoke all on public.user_skill_assignments from public,anon,authenticated;
grant all on public.user_skill_assignments to service_role;
create index if not exists user_skill_assignments_skill on public.user_skill_assignments(skill_id);
-- Preserve earlier progress associations without altering their measurements.
insert into public.user_skill_assignments(user_id,skill_id)
select p.user_id,p.skill_id from public.user_skill_progress p join public.profiles u on u.id=p.user_id where u.role='developer'
on conflict do nothing;
create or replace function public.skills_assign_progress() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.profiles where id=new.user_id and role='developer') then
  insert into public.user_skill_assignments(user_id,skill_id) values(new.user_id,new.skill_id) on conflict do nothing;
 end if;
 return new;
end; $$;
drop trigger if exists skills_assign_progress on public.user_skill_progress;
create trigger skills_assign_progress after insert on public.user_skill_progress for each row execute function public.skills_assign_progress();

create or replace function public.skills_set_assignment(p_actor uuid,p_user uuid,p_skill uuid,p_active boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin' and status='active') then raise exception 'forbidden' using errcode='42501'; end if;
 perform 1 from public.profiles where id=p_user and role='developer' for share;
 if not found then raise exception 'Developer not found' using errcode='P0002'; end if;
 perform 1 from public.skills where id=p_skill and (not p_active or is_active) for share;
 if not found then raise exception 'Active skill not found' using errcode='P0002'; end if;
 insert into public.user_skill_assignments(user_id,skill_id,is_active,assigned_by) values(p_user,p_skill,p_active,p_actor)
 on conflict(user_id,skill_id) do update set is_active=excluded.is_active,assigned_by=excluded.assigned_by;
 -- Deliberately no progress/history writes: assignment is not assessment.
 insert into public.audit_log(actor_id,target_id,action,"after") values(p_actor,p_user,'skill.assignment',jsonb_build_object('skill_id',p_skill,'active',p_active));
end; $$;

create or replace function public.skills_replace_challenge_links(p_actor uuid,p_challenge uuid,p_links jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare entry jsonb;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin' and status='active') then raise exception 'forbidden' using errcode='42501'; end if;
 perform 1 from public.challenges where id=p_challenge for update;
 if not found then raise exception 'Challenge not found' using errcode='P0002'; end if;
 if jsonb_typeof(p_links) is distinct from 'array' then raise exception 'Invalid links' using errcode='22023'; end if;
 if jsonb_array_length(p_links)>10 or (select count(*)<>count(distinct x->>'skillId') from jsonb_array_elements(p_links) x) then raise exception 'Duplicate or excessive links' using errcode='22023'; end if;
 for entry in select * from jsonb_array_elements(p_links) loop
  if coalesce((entry->>'weight')::int,1) not between 1 and 3 then raise exception 'Invalid weight' using errcode='22023'; end if;
  perform 1 from public.skills s where s.id=(entry->>'skillId')::uuid and (s.is_active or exists(select 1 from public.challenge_skills c where c.challenge_id=p_challenge and c.skill_id=s.id)) for share;
  if not found then raise exception 'Active skill not found' using errcode='P0002'; end if;
 end loop;
 insert into public.challenge_skills(challenge_id,skill_id,weight)
 select p_challenge,(x->>'skillId')::uuid,coalesce((x->>'weight')::int,1) from jsonb_array_elements(p_links) x
 on conflict(challenge_id,skill_id) do update set weight=excluded.weight;
 delete from public.challenge_skills where challenge_id=p_challenge and skill_id not in(select (x->>'skillId')::uuid from jsonb_array_elements(p_links) x);
 insert into public.audit_log(actor_id,target_id,action,"after") values(p_actor,p_challenge,'challenge_skills.replace',p_links);
 -- Historical results and score snapshots are not recalculated by catalogue edits.
end; $$;
revoke all on function public.skills_assign_progress(),public.skills_set_assignment(uuid,uuid,uuid,boolean),public.skills_replace_challenge_links(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.skills_set_assignment(uuid,uuid,uuid,boolean),public.skills_replace_challenge_links(uuid,uuid,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
