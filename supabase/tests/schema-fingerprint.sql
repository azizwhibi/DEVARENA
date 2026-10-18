-- Read-only semantic schema fingerprint for MCP replay verification.
-- Compare before/after reapplying the three identity migrations.
-- Sort function ACL entries: grant order can change while privileges stay identical.

select md5(jsonb_build_object(
 'columns',(select jsonb_agg(to_jsonb(x) order by table_name,ordinal_position) from information_schema.columns x where table_schema in ('public','private')),
 'constraints',(select jsonb_agg(jsonb_build_array(c.conname, c.conrelid::regclass::text, pg_get_constraintdef(c.oid)) order by c.conrelid::regclass::text,c.conname) from pg_catalog.pg_constraint c join pg_catalog.pg_namespace n on n.oid=c.connamespace where n.nspname in ('public','private')),
 'indexes',(select jsonb_agg(to_jsonb(x) order by schemaname,tablename,indexname) from pg_catalog.pg_indexes x where schemaname in ('public','private')),
 'policies',(select jsonb_agg(to_jsonb(x) order by schemaname,tablename,policyname) from pg_catalog.pg_policies x where schemaname in ('public','private') or (schemaname='storage' and policyname like 'avatars_%')),
 'table_grants',(select jsonb_agg(to_jsonb(x) order by table_name,grantee,privilege_type) from information_schema.table_privileges x where table_schema='public'),
 'column_grants',(select jsonb_agg(to_jsonb(x) order by table_name,column_name,grantee,privilege_type) from information_schema.column_privileges x where table_schema='public'),
 'functions',(select jsonb_agg(jsonb_build_array(n.nspname,p.proname,pg_get_functiondef(p.oid),(select jsonb_agg(a::text order by a::text) from unnest(p.proacl) a)) order by n.nspname,p.proname) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private')),
 'triggers',(select jsonb_agg(pg_get_triggerdef(t.oid) order by t.tgrelid::regclass::text,t.tgname) from pg_catalog.pg_trigger t where not t.tgisinternal and (t.tgrelid in (select c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public') or t.tgname in ('on_auth_user_created','on_auth_user_email_changed'))),
 'bucket',(select to_jsonb(b) from storage.buckets b where id='avatars')
)::text) as fingerprint;
