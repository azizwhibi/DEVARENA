-- Run AFTER 01_fill_catalogue.sql and after importing challenges_import_100.csv.
-- Replay-safe. Adds links only; does not create problems or award completion.
begin;
set local lock_timeout='10s';
select pg_advisory_xact_lock(hashtext('devarena.topics.catalogue.v1'));

do $$ begin
 if to_regclass('public.challenge_topics') is null or to_regclass('public.challenge_skills') is null then
  raise exception 'Apply db/skills-integration.sql and db/problem-topics.sql first.';
 end if;
 if not exists(select 1 from public.skills where slug='dynamic-programming' or lower(btrim(name))='dynamic programming') then
  raise exception 'Run db/topics/01_fill_catalogue.sql first.';
 end if;
end $$;

create temporary table problem_classifications(
 category text primary key, skill_name text, skill_slug text, topic_name text, topic_slug text
) on commit drop;
insert into problem_classifications values
 ('Arrays','Arrays','arrays','Array','array'),
 ('Strings','Strings','strings','String','string'),
 ('Hash Tables','Hash tables','hash-tables','Hash Table','hash-table'),
 ('Two Pointers','Two pointers','two-pointers','Two Pointers','two-pointers'),
 ('Sliding Window','Sliding windows','sliding-windows','Sliding Window','sliding-window'),
 ('Binary Search','Binary search','binary-search','Binary Search','binary-search'),
 ('Stacks','Stacks','stacks','Stack','stack'),
 ('Monotonic Stack','Monotonic stacks','monotonic-stacks','Monotonic Stack','monotonic-stack'),
 ('Intervals','Intervals','intervals','Intervals','intervals'),
 ('Monotonic Queue','Monotonic queues','monotonic-queues','Monotonic Queue','monotonic-queue'),
 ('Matrices','Matrices','matrices','Matrix','matrix'),
 ('Breadth-First Search','Breadth-first search','breadth-first-search','Breadth-First Search','breadth-first-search'),
 ('Prefix Sum','Prefix sums','prefix-sums','Prefix Sum','prefix-sum'),
 ('Trees','Trees','trees','Tree','tree'),
 ('Graphs','Graphs','graphs','Graph Theory','graph-theory'),
 ('Topological Sort','Topological sorting','topological-sorting','Topological Sort','topological-sort'),
 ('Shortest Path','Shortest paths','shortest-paths','Shortest Path','shortest-path'),
 ('Minimum Spanning Tree','Minimum spanning trees','minimum-spanning-trees','Minimum Spanning Tree','minimum-spanning-tree'),
 ('Dynamic Programming','Dynamic programming','dynamic-programming','Dynamic Programming','dynamic-programming'),
 ('SQL Filtering','SQL filtering','sql-filtering','SQL Filtering','sql-filtering'),
 ('SQL Aggregation','SQL aggregation','sql-aggregation','SQL Aggregation','sql-aggregation'),
 ('SQL Joins','SQL joins','sql-joins','SQL Joins','sql-joins'),
 ('SQL Window Functions','SQL window functions','sql-window-functions','SQL Window Functions','sql-window-functions'),
 ('SQL Subqueries','SQL subqueries','sql-subqueries','SQL Subqueries','sql-subqueries'),
 ('SQL Dates','SQL dates','sql-dates','SQL Dates','sql-dates');

insert into public.challenge_topics(challenge_id,topic_id)
 select c.id,t.id from public.challenges c
 join problem_classifications m on lower(btrim(c.category))=lower(m.category)
 join public.topics t on (t.slug=m.topic_slug or lower(btrim(t.name))=lower(m.topic_name)) and t.is_active
 on conflict(challenge_id,topic_id) do nothing;
insert into public.challenge_skills(challenge_id,skill_id,weight)
 select c.id,s.id,1 from public.challenges c
 join problem_classifications m on lower(btrim(c.category))=lower(m.category)
 join public.skills s on (s.slug=m.skill_slug or lower(btrim(s.name))=lower(m.skill_name)) and s.is_active
 on conflict(challenge_id,skill_id) do nothing;

-- SQL is classified both by its specific topic and by the existing Database topic.
insert into public.challenge_topics(challenge_id,topic_id)
 select c.id,t.id from public.challenges c
 join public.topics t on (t.slug='database' or lower(btrim(t.name))='database') and t.is_active
 where lower(btrim(c.category)) like 'sql %' or lower(c.title) like 'sql:%'
 on conflict(challenge_id,topic_id) do nothing;

-- A few explicit secondary techniques used by the supplied problem statements.
create temporary table problem_secondary_links(
 title text, skill_name text, skill_slug text, topic_name text, topic_slug text
) on commit drop;
insert into problem_secondary_links values
 ('Largest Contiguous Total','Dynamic programming','dynamic-programming','Dynamic Programming','dynamic-programming'),
 ('Product Outside Each Position','Prefix sums','prefix-sums','Prefix Sum','prefix-sum'),
 ('Count Target-Sum Subarrays','Prefix sums','prefix-sums','Prefix Sum','prefix-sum'),
 ('Merge Overlapping Closed Intervals','Sorting','sorting','Sorting','sorting'),
 ('Minimum Meeting Rooms','Sorting','sorting','Sorting','sorting'),
 ('Sorted Squares','Arrays','arrays','Array','array'),
 ('Smallest Covering Substring','Hash tables','hash-tables','Hash Table','hash-table'),
 ('Python: Stable Unique Values','Arrays','arrays','Array','array'),
 ('Python: Stable Unique Values','Hash tables','hash-tables','Hash Table','hash-table'),
 ('JavaScript: First Matching Pair','Arrays','arrays','Array','array'),
 ('JavaScript: First Matching Pair','Hash tables','hash-tables','Hash Table','hash-table'),
 ('SQL: Customers Without Orders','SQL joins','sql-joins','SQL Joins','sql-joins'),
 ('SQL: Customers Without Orders','SQL subqueries','sql-subqueries','SQL Subqueries','sql-subqueries');
insert into public.challenge_topics(challenge_id,topic_id)
 select c.id,t.id from public.challenges c
 join problem_secondary_links m on lower(btrim(c.title))=lower(m.title)
 join public.topics t on (t.slug=m.topic_slug or lower(btrim(t.name))=lower(m.topic_name)) and t.is_active
 on conflict(challenge_id,topic_id) do nothing;
insert into public.challenge_skills(challenge_id,skill_id,weight)
 select c.id,s.id,1 from public.challenges c
 join problem_secondary_links m on lower(btrim(c.title))=lower(m.title)
 join public.skills s on (s.slug=m.skill_slug or lower(btrim(s.name))=lower(m.skill_name)) and s.is_active
 on conflict(challenge_id,skill_id) do nothing;

select c.category,count(*) as classified_problems
 from public.challenges c
 where exists(select 1 from public.challenge_topics ct where ct.challenge_id=c.id)
   and exists(select 1 from public.challenge_skills cs where cs.challenge_id=c.id)
 group by c.category order by c.category nulls last;
notify pgrst,'reload schema';
commit;
