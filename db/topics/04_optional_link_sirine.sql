-- OPTIONAL: run only if your skill named "sirine" belongs to your custom
-- technology named "sirine", rather than to React as in the supplied export.
-- This moves that existing classification; it creates no fake technical skills.
-- IDs, active state, problem links and all assessment records remain intact.
begin;
set local lock_timeout='10s';
do $$
declare technology uuid; skill uuid; candidates uuid[];
begin
 select array_agg(id) into candidates from public.technologies where lower(btrim(name))='sirine';
 if coalesce(cardinality(candidates),0)<>1 then
  raise exception 'Expected one existing technology named sirine. No rows changed.';
 end if;
 technology:=candidates[1];
 select array_agg(id) into candidates from public.skills where lower(btrim(name))='sirine';
 if coalesce(cardinality(candidates),0)<>1 then
  raise exception 'Expected one existing skill named sirine. No rows changed.';
 end if;
 skill:=candidates[1];
 update public.skills set technology_id=technology where id=skill and technology_id is distinct from technology;
end $$;
select t.name as technology,s.name as skill,s.is_active
from public.skills s join public.technologies t on t.id=s.technology_id
where lower(btrim(t.name))='sirine';
commit;
