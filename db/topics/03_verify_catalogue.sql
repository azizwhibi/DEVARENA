-- Read-only diagnostics. Run after 01 and 02, then refresh DevArena.

-- Each active programming technology should now have linked active skills.
select t.id,t.name as technology,count(s.id) as active_skills,
 coalesce(string_agg(s.name,', ' order by s.name),'') as skills
from public.technologies t
left join public.skills s on s.technology_id=t.id and s.is_active
where t.is_active
group by t.id,t.name order by t.name;

-- These are real visible-problem counts; no placeholder numbers are stored.
select t.id,t.name as topic,count(c.id) as published_problems
from public.topics t
left join public.challenge_topics ct on ct.topic_id=t.id
left join public.challenges c on c.id=ct.challenge_id and c.is_published
where t.is_active
group by t.id,t.name order by published_problems desc,t.name;

-- Published problems still needing classification: empty when all supplied 103 exist and are linked.
select c.id,c.title,c.category,
 not exists(select 1 from public.challenge_topics ct where ct.challenge_id=c.id) as missing_topics,
 not exists(select 1 from public.challenge_skills cs where cs.challenge_id=c.id) as missing_skills
from public.challenges c where c.is_published and (
 not exists(select 1 from public.challenge_topics ct where ct.challenge_id=c.id) or
 not exists(select 1 from public.challenge_skills cs where cs.challenge_id=c.id))
order by c.title;

-- Archived rows are deliberately preserved, not silently restored by the seed.
select 'technology' as kind,name,slug from public.technologies where not is_active
union all select 'skill',name,slug from public.skills where not is_active
union all select 'category',name,slug from public.skill_categories where not is_active
union all select 'topic',name,slug from public.topics where not is_active
order by kind,name;

-- A custom technology with no skills is a data association issue, not a score issue.
select t.id,t.name as technology_without_skills
from public.technologies t where t.is_active
and not exists(select 1 from public.skills s where s.technology_id=t.id and s.is_active)
order by t.name;
