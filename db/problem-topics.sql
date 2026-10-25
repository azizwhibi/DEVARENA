-- Apply after skills-integration.sql. Existing challenges remain the problem store.
begin;
set local lock_timeout='10s';
create table if not exists public.topics (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(btrim(name)) between 2 and 80),
 slug text not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=100),
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create unique index if not exists topics_name_unique on public.topics(lower(btrim(name)));
create unique index if not exists topics_slug_unique on public.topics(slug);
create table if not exists public.challenge_topics (
 challenge_id uuid not null references public.challenges(id) on delete cascade,
 topic_id uuid not null references public.topics(id) on delete restrict,
 primary key(challenge_id,topic_id)
);
create index if not exists challenge_topics_topic on public.challenge_topics(topic_id,challenge_id);
create index if not exists problems_published_title on public.challenges(title,id) where is_published=true;
alter table public.topics enable row level security;
alter table public.challenge_topics enable row level security;
revoke all on public.topics,public.challenge_topics from public,anon,authenticated;
grant all on public.topics,public.challenge_topics to service_role;

create or replace function public.problem_topic_counts(p_archived boolean default false)
returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'slug',t.slug,'is_active',t.is_active,
 'problemCount',(select count(*) from public.challenge_topics ct join public.challenges c on c.id=ct.challenge_id where ct.topic_id=t.id and c.is_published=true)) order by t.name,t.id),'[]'::jsonb)
 from public.topics t where p_archived or t.is_active;
$$;

create or replace function public.problem_catalogue(p_user uuid,p_admin boolean,p_q text,p_difficulty text,p_topic uuid,p_page int,p_size int)
returns jsonb language sql stable set search_path='' as $$
 with filtered as (
 select c.* from public.challenges c where (p_admin or c.is_published=true)
 and (p_q='' or c.title ilike '%'||replace(replace(replace(p_q,'\','\\'),'%','\%'),'_','\_')||'%' or c.description ilike '%'||replace(replace(replace(p_q,'\','\\'),'%','\%'),'_','\_')||'%')
 and (p_difficulty='' or c.difficulty=p_difficulty)
 and (p_topic is null or exists(select 1 from public.challenge_topics ct join public.topics t on t.id=ct.topic_id where ct.challenge_id=c.id and ct.topic_id=p_topic and (p_admin or t.is_active)))
 ), paged as (select * from filtered order by title,id limit p_size offset (p_page-1)*p_size)
 select jsonb_build_object('total',(select count(*) from filtered),'page',p_page,'pageSize',p_size,'items',
 coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'description',c.description,'difficulty',c.difficulty,'is_published',c.is_published,
 'solved',exists(select 1 from public.attempts a where a.user_id=p_user and a.challenge_id=c.id and a.is_validated=true),
 'topics',(select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'slug',t.slug,'is_active',t.is_active) order by t.name),'[]'::jsonb) from public.challenge_topics ct join public.topics t on t.id=ct.topic_id where ct.challenge_id=c.id and (p_admin or t.is_active))) order by c.title,c.id) from paged c),'[]'::jsonb));
$$;

create or replace function public.problem_replace_topics(p_actor uuid,p_problem uuid,p_topics uuid[])
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin' and status='active') then raise exception 'Forbidden' using errcode='42501'; end if;
 perform 1 from public.challenges where id=p_problem for update;
 if not found then raise exception 'Problem not found' using errcode='P0002'; end if;
 if p_topics is null or cardinality(p_topics)>50 or cardinality(p_topics)<>(select count(distinct id) from unnest(p_topics) id) then raise exception 'Invalid or duplicate topics' using errcode='22023'; end if;
 if exists(select 1 from unnest(p_topics) as chosen(topic_id) where not exists(select 1 from public.topics t where t.id=chosen.topic_id and (t.is_active or exists(select 1 from public.challenge_topics ct where ct.challenge_id=p_problem and ct.topic_id=chosen.topic_id)))) then raise exception 'Active topic not found' using errcode='22023'; end if;
 insert into public.challenge_topics(challenge_id,topic_id) select p_problem,id from unnest(p_topics) id on conflict do nothing;
 delete from public.challenge_topics where challenge_id=p_problem and not(topic_id=any(p_topics));
end; $$;
revoke all on function public.problem_topic_counts(boolean),public.problem_catalogue(uuid,boolean,text,text,uuid,int,int),public.problem_replace_topics(uuid,uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.problem_topic_counts(boolean),public.problem_catalogue(uuid,boolean,text,text,uuid,int,int),public.problem_replace_topics(uuid,uuid,uuid[]) to service_role;
notify pgrst,'reload schema';
commit;
