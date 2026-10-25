-- Publishes only the four reviewed, authored starter lessons. Imported courses remain drafts.
begin;
update public.knowledge_resources
set status='published',published_at=coalesce(published_at,now()),updated_at=now()
where source='devarena' and status='draft'
  and external_source_id in (
   'devarena-example-inner-join-v1',
   'devarena-example-react-state-v1',
   'devarena-example-async-await-v1',
   'devarena-example-git-branch-v1'
  )
  and length(btrim(title)) between 2 and 200
  and length(btrim(content))>0
returning id,title,status,published_at;
commit;
