-- Apply after skills-management.sql and problem-topics.sql. No assessment writes.
begin;
set local lock_timeout = '10s';
alter table public.challenges add column if not exists published_at timestamptz,
 add column if not exists archived_at timestamptz;
-- Existing published problems can never become disposable drafts.
update public.challenges set published_at=now() where is_published and published_at is null;

create or replace function public.problem_admin_save(p_actor uuid,p_id uuid,p_data jsonb,p_topics uuid[],p_skills jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_title text:=btrim(p_data->>'title');
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin' and status='active') then raise exception 'Forbidden' using errcode='42501'; end if;
 if v_title is null or length(v_title) not between 2 and 200 or
    coalesce(length(p_data->>'description'),0)>50000 or
    (p_data->>'difficulty') is null or (p_data->>'difficulty') not in ('beginner','intermediate','advanced','expert') or
    coalesce(length(p_data->>'category'),0)>80 or
    (p_data->>'duration_seconds' is not null and (p_data->>'duration_seconds')::int not between 30 and 86400)
 then raise exception 'Invalid problem fields' using errcode='22023'; end if;
 -- Serialize normalized title checks without rejecting legacy duplicate rows during migration.
 perform pg_advisory_xact_lock(hashtext(lower(v_title)));
 if exists(select 1 from public.challenges where lower(btrim(title))=lower(v_title) and id is distinct from p_id) then
   raise exception 'Problem title already exists' using errcode='23505'; end if;
 if p_id is null then
   insert into public.challenges(title,description,difficulty,category,duration_seconds,is_published)
   values(v_title,coalesce(p_data->>'description',''),p_data->>'difficulty',p_data->>'category',(p_data->>'duration_seconds')::int,false) returning id into v_id;
 else
   perform 1 from public.challenges where id=p_id for update;
   if not found then raise exception 'Problem not found' using errcode='P0002'; end if;
   if exists(select 1 from public.challenges where id=p_id and is_published and length(btrim(coalesce(p_data->>'description','')))<10) then
     raise exception 'Published problems require a statement' using errcode='22023'; end if;
   update public.challenges set title=v_title,description=coalesce(p_data->>'description',''),difficulty=p_data->>'difficulty',
    category=p_data->>'category',duration_seconds=(p_data->>'duration_seconds')::int where id=p_id;
   v_id:=p_id;
 end if;
 if p_topics is not null then perform public.problem_replace_topics(p_actor,v_id,p_topics); end if;
 if p_skills is not null then perform public.skills_replace_challenge_links(p_actor,v_id,p_skills); end if;
 return v_id;
end $$;

create or replace function public.problem_admin_action(p_actor uuid,p_id uuid,p_action text)
returns void language plpgsql security definer set search_path='' as $$
declare r public.challenges; referenced boolean;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='admin' and status='active') then raise exception 'Forbidden' using errcode='42501'; end if;
 select * into r from public.challenges where id=p_id for update;
 if not found then raise exception 'Problem not found' using errcode='P0002'; end if;
 if p_action='publish' then
   if length(btrim(r.title)) not between 2 and 200 or length(btrim(coalesce(r.description,'')))<10 then
     raise exception 'Add a title and a statement of at least 10 characters' using errcode='22023'; end if;
   update public.challenges set is_published=true,published_at=coalesce(published_at,now()),archived_at=null where id=p_id;
 elsif p_action='archive' then
   update public.challenges set is_published=false,archived_at=now() where id=p_id;
 elsif p_action='delete' then
   if r.is_published or r.published_at is not null or r.archived_at is not null or
      exists(select 1 from public.attempts where challenge_id=p_id) then
     raise exception 'Archive referenced or previously published problems' using errcode='23503'; end if;
   if to_regclass('public.marketplace_items') is not null then
     execute 'select exists(select 1 from public.marketplace_items where challenge_id=$1)' into referenced using p_id;
     if referenced then raise exception 'Referenced by Marketplace: archive instead' using errcode='23503'; end if;
   end if;
   delete from public.challenges where id=p_id;
 else raise exception 'Invalid action' using errcode='22023'; end if;
end $$;
revoke all on function public.problem_admin_save(uuid,uuid,jsonb,uuid[],jsonb),public.problem_admin_action(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.problem_admin_save(uuid,uuid,jsonb,uuid[],jsonb),public.problem_admin_action(uuid,uuid,text) to service_role;
notify pgrst,'reload schema';
commit;
