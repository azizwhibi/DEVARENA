-- Apply after skills-integration.sql. Additive; no user, auth or measured-skill writes.
begin;
set local lock_timeout = '5s';
create table if not exists public.knowledge_resources (id uuid primary key default gen_random_uuid());
alter table public.knowledge_resources
 add column if not exists title text not null default '',
 add column if not exists description text not null default '',
 add column if not exists resource_type text not null default 'article',
 add column if not exists content text not null default '',
 add column if not exists external_url text,
 add column if not exists difficulty text not null default 'unknown',
 add column if not exists technology_id uuid references public.technologies(id) on delete set null,
 add column if not exists tags text[] not null default '{}',
 add column if not exists estimated_minutes integer,
 add column if not exists status text not null default 'draft',
 add column if not exists source text not null default 'manual',
 add column if not exists external_source_id text,
 add column if not exists attribution text not null default '',
 add column if not exists created_by uuid references public.profiles(id) on delete set null,
 add column if not exists created_at timestamptz not null default now(),
 add column if not exists updated_at timestamptz not null default now(),
 add column if not exists published_at timestamptz;
-- NOT VALID preserves legacy rows; constraints still apply to new or edited rows.
do $$ begin
 if not exists(select 1 from pg_constraint where conname='knowledge_resource_valid' and conrelid='public.knowledge_resources'::regclass) then
 alter table public.knowledge_resources add constraint knowledge_resource_valid check (
 length(btrim(title)) between 2 and 200 and length(description)<=2000 and length(content)<=100000
 and resource_type in ('article','tutorial','video','documentation','course')
 and difficulty in ('unknown','beginner','intermediate','advanced')
 and status in ('draft','published','archived')
 and (estimated_minutes is null or estimated_minutes between 1 and 100000)
 and (external_url is null or external_url ~ '^https?://[^[:space:]<>]+$')
 and (status <> 'published' or (published_at is not null and (length(btrim(content)) > 0 or external_url is not null)))
 ) not valid;
 end if;
end $$;
create unique index if not exists knowledge_source_identity on public.knowledge_resources(source,external_source_id) where external_source_id is not null;
create index if not exists knowledge_catalogue on public.knowledge_resources(status,created_at desc,id);
create index if not exists knowledge_technology on public.knowledge_resources(technology_id);
create table if not exists public.knowledge_resource_skills (
 resource_id uuid not null references public.knowledge_resources(id) on delete cascade,
 skill_id uuid not null references public.skills(id) on delete restrict,
 primary key(resource_id,skill_id)
);
create index if not exists knowledge_skill_resources on public.knowledge_resource_skills(skill_id,resource_id);
create table if not exists public.knowledge_bookmarks (
 user_id uuid not null references public.profiles(id) on delete cascade,
 resource_id uuid not null references public.knowledge_resources(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,resource_id)
);
create index if not exists knowledge_bookmark_resource on public.knowledge_bookmarks(resource_id);
create table if not exists public.knowledge_progress (
 user_id uuid not null references public.profiles(id) on delete cascade,
 resource_id uuid not null references public.knowledge_resources(id) on delete cascade,
 state text not null check(state in ('started','completed')),
 percentage integer not null check(percentage between 0 and 100),
 started_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz,
 primary key(user_id,resource_id),
 check ((state='completed' and percentage=100 and completed_at is not null) or (state='started' and percentage<100 and completed_at is null))
);
create index if not exists knowledge_progress_resource on public.knowledge_progress(resource_id);
create table if not exists public.knowledge_recommendations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 resource_id uuid not null references public.knowledge_resources(id) on delete cascade,
 batch_id uuid not null, position integer not null check(position between 1 and 20),
 target_skill_id uuid references public.skills(id) on delete set null,
 method text not null, explanation text not null, evidence jsonb not null default '{}',
 created_at timestamptz not null default now(), unique(user_id,batch_id,position)
);
create index if not exists knowledge_recommendations_user on public.knowledge_recommendations(user_id,created_at desc);
create index if not exists knowledge_recommendations_resource on public.knowledge_recommendations(resource_id);
create index if not exists knowledge_recommendations_skill on public.knowledge_recommendations(target_skill_id);
create table if not exists public.knowledge_feedback (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 resource_id uuid not null references public.knowledge_resources(id) on delete cascade,
 recommendation_id uuid references public.knowledge_recommendations(id) on delete set null,
 feedback text not null check(feedback in ('useful','not_relevant','too_easy','too_difficult')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,resource_id)
);
create index if not exists knowledge_feedback_recommendation on public.knowledge_feedback(recommendation_id);
create index if not exists knowledge_feedback_resource on public.knowledge_feedback(resource_id);
-- Clicks are explicit events. Recommendation generation never creates an impression.
create table if not exists public.knowledge_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 resource_id uuid not null references public.knowledge_resources(id) on delete cascade,
 recommendation_id uuid references public.knowledge_recommendations(id) on delete set null,
 event_type text not null check(event_type='click'), created_at timestamptz not null default now()
);
create index if not exists knowledge_events_user on public.knowledge_events(user_id,created_at desc);
create index if not exists knowledge_events_resource on public.knowledge_events(resource_id);
create index if not exists knowledge_events_recommendation on public.knowledge_events(recommendation_id);
-- Atomic resource edits and skill associations, including clearing all associations.
create or replace function public.knowledge_save_resource(p_id uuid,p_actor uuid,p_data jsonb,p_skills uuid[] default null)
returns public.knowledge_resources language plpgsql set search_path='' as $$
declare r public.knowledge_resources;
begin
 if p_id is null then
   insert into public.knowledge_resources(title,description,resource_type,content,external_url,difficulty,technology_id,tags,estimated_minutes,source,external_source_id,attribution,created_by)
   values (p_data->>'title',coalesce(p_data->>'description',''),coalesce(p_data->>'resource_type','article'),coalesce(p_data->>'content',''),p_data->>'external_url',coalesce(p_data->>'difficulty','unknown'),(p_data->>'technology_id')::uuid,
   array(select jsonb_array_elements_text(coalesce(p_data->'tags','[]'))),(p_data->>'estimated_minutes')::integer,coalesce(p_data->>'source','manual'),p_data->>'external_source_id',coalesce(p_data->>'attribution',''),p_actor) returning * into r;
 else
   select * into r from public.knowledge_resources where id=p_id for update;
   if not found then raise exception 'Resource not found' using errcode='P0002'; end if;
   -- Only explicitly supplied fields are changed. Publication fields have separate actions.
   r := jsonb_populate_record(r,p_data - array['id','status','created_by','created_at','published_at','updated_at']);
   update public.knowledge_resources set title=r.title,description=r.description,resource_type=r.resource_type,content=r.content,
    external_url=r.external_url,difficulty=r.difficulty,technology_id=r.technology_id,tags=r.tags,estimated_minutes=r.estimated_minutes,
    source=r.source,external_source_id=r.external_source_id,attribution=r.attribution,updated_at=now() where id=p_id returning * into r;
 end if;
 if p_skills is not null then
   delete from public.knowledge_resource_skills where resource_id=r.id;
   insert into public.knowledge_resource_skills(resource_id,skill_id) select r.id,unnest(p_skills);
 end if;
 return r;
end $$;
-- Recheck publication under a row lock, so archiving cannot race activity writes.
create or replace function public.knowledge_save_activity(p_user uuid,p_resource uuid,p_kind text,p_percentage integer default 0)
returns jsonb language plpgsql set search_path='' as $$
declare result jsonb;
begin
 perform 1 from public.knowledge_resources where id=p_resource and status='published' for share;
 if not found then raise exception 'Published resource not found' using errcode='P0002'; end if;
 if p_kind='bookmark' then
   insert into public.knowledge_bookmarks(user_id,resource_id) values(p_user,p_resource) on conflict do nothing;
   select to_jsonb(b) into result from public.knowledge_bookmarks b where user_id=p_user and resource_id=p_resource;
 elsif p_kind='progress' then
   if p_percentage is null or p_percentage not between 0 and 100 then raise exception 'Invalid progress' using errcode='23514'; end if;
   insert into public.knowledge_progress(user_id,resource_id,state,percentage,completed_at)
   values(p_user,p_resource,case when p_percentage=100 then 'completed' else 'started' end,p_percentage,case when p_percentage=100 then now() end)
   on conflict(user_id,resource_id) do update set state=excluded.state,percentage=excluded.percentage,
    completed_at=case when excluded.state='completed' then coalesce(knowledge_progress.completed_at,excluded.completed_at) end,updated_at=now();
   select to_jsonb(p) into result from public.knowledge_progress p where user_id=p_user and resource_id=p_resource;
 else raise exception 'Invalid activity' using errcode='23514';
 end if;
 return result;
end $$;
do $$ declare t text; begin
 foreach t in array array['knowledge_resources','knowledge_resource_skills','knowledge_bookmarks','knowledge_progress','knowledge_recommendations','knowledge_feedback','knowledge_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
revoke all on function public.knowledge_save_resource(uuid,uuid,jsonb,uuid[]) from public,anon,authenticated;
revoke all on function public.knowledge_save_activity(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.knowledge_save_resource(uuid,uuid,jsonb,uuid[]),public.knowledge_save_activity(uuid,uuid,text,integer) to service_role;
notify pgrst,'reload schema';
commit;
