-- Optional original practice examples, not verified code-execution problems.
-- Run after problem-topics.sql. Replay never modifies existing records.
begin;
insert into public.topics(name,slug) values
 ('Array','array'),('String','string'),('Hash Table','hash-table'),('Database','database'),('Sorting','sorting'),('Two Pointers','two-pointers')
on conflict do nothing;
insert into public.challenges(id,title,description,difficulty,is_published) values
 ('5f0e30a2-aacf-4b91-bb02-a2ef62284d31','Python: Stable Unique Values','Given a sequence, return its distinct values in their first-seen order. Explain a set-based approach and its complexity.','beginner',true),
 ('e5c91ba4-92a5-431f-82e9-1130f3de92e4','SQL: Customers Without Orders','Write a query to find customers who have no matching orders. Compare NOT EXISTS with a LEFT JOIN.','intermediate',true),
 ('b7377233-6d79-46e3-bba9-bf0bda72cf6c','JavaScript: First Matching Pair','Given an array and target sum, return the indices of a matching pair using a map. Explain handling repeated values.','beginner',true)
on conflict do nothing;
insert into public.challenge_topics(challenge_id,topic_id)
select x.id,t.id from (values
 ('5f0e30a2-aacf-4b91-bb02-a2ef62284d31'::uuid,'array'),('5f0e30a2-aacf-4b91-bb02-a2ef62284d31'::uuid,'hash-table'),
 ('e5c91ba4-92a5-431f-82e9-1130f3de92e4'::uuid,'database'),
 ('b7377233-6d79-46e3-bba9-bf0bda72cf6c'::uuid,'array'),('b7377233-6d79-46e3-bba9-bf0bda72cf6c'::uuid,'hash-table')) x(id,slug)
join public.topics t on t.slug=x.slug on conflict do nothing;
commit;
