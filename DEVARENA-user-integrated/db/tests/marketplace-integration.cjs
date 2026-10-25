// Embedded PostgreSQL only: no .env, Supabase connection, or shared data.
const fs = require('node:fs'), assert = require('node:assert/strict');
const { PGlite } = require('../../.local/verification/node_modules/@electric-sql/pglite');
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
      create table profiles(id uuid primary key references auth.users(id) on delete cascade,username text,role text default 'developer',status text default 'active');
      create table challenges(id uuid primary key,title text,difficulty text);
      create table audit_log(id uuid default gen_random_uuid(),actor_id uuid,target_id uuid,action text,"before" jsonb,"after" jsonb);
      create table knowledge_resources(id uuid primary key,title text);
      create table user_skill_progress(user_id uuid,level_score numeric);
      create function public.test_profile() returns trigger language plpgsql as $$ begin insert into profiles(id,username) values(new.id,new.email); return new; end; $$;
      create trigger test_profile after insert on auth.users for each row execute function test_profile();
      insert into auth.users(id,email) values('10000000-0000-4000-8000-000000000001','host-user');
      insert into knowledge_resources values('10000000-0000-4000-8000-000000000002','Host lesson');
      insert into user_skill_progress values('10000000-0000-4000-8000-000000000001',72);`);
    const migration = fs.readFileSync('db/marketplace-integration.sql','utf8');
    await db.exec(migration);
    await db.exec(fs.readFileSync('db/tests/marketplace-source.sql','utf8').replace(/^\\echo.*$/gm, ''));
    console.log('PASS: source SQL purchase/duplicate/balance/ownership/hint/admin/security assertions (rolled-back fixtures).');
    await db.exec(`insert into credit_wallets(user_id,balance) values('10000000-0000-4000-8000-000000000001',123);
      insert into marketplace_items(id,kind,title,price_credits,status) values('10000000-0000-4000-8000-000000000003','icon','Existing item',20,'published');
      insert into marketplace_purchases(user_id,item_id,price_paid) values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003',20);
      insert into user_equipped_items(user_id,slot,item_id) values('10000000-0000-4000-8000-000000000001','icon','10000000-0000-4000-8000-000000000003');
      insert into credit_transactions(user_id,amount,kind,item_id) values('10000000-0000-4000-8000-000000000001',-20,'marketplace_purchase','10000000-0000-4000-8000-000000000003');`);
    await db.exec(migration);
    assert.equal((await db.query('select balance from credit_wallets')).rows[0].balance,123);
    assert.equal((await db.query('select count(*)::int as n from marketplace_purchases')).rows[0].n,1);
    assert.equal((await db.query('select count(*)::int as n from user_equipped_items')).rows[0].n,1);
    assert.equal((await db.query('select amount from credit_transactions')).rows[0].amount,-20);
    assert.equal((await db.query('select level_score::int as level_score from user_skill_progress')).rows[0].level_score,72);
    assert.equal((await db.query('select title from knowledge_resources')).rows[0].title,'Host lesson');
    const seed=fs.readFileSync('db/marketplace-seed.sql','utf8'); await db.exec(seed); await db.exec(seed);
    assert.equal((await db.query("select count(*)::int as n from marketplace_items where status='draft'")).rows[0].n,2);
    // Fail after the wallet update to demonstrate rollback of all purchase effects.
    await db.exec(`create function fail_purchase() returns trigger language plpgsql as $$ begin raise exception 'injected_failure'; end; $$;
      create trigger fail_purchase before insert on marketplace_purchases for each row execute function fail_purchase();
      update marketplace_items set status='published' where id='a8b10000-0000-4000-8000-000000000001';`);
    await assert.rejects(db.query("select * from purchase_marketplace_item('10000000-0000-4000-8000-000000000001','a8b10000-0000-4000-8000-000000000001')"),/injected_failure/);
    assert.equal((await db.query('select balance from credit_wallets')).rows[0].balance,123);
    assert.equal((await db.query('select count(*)::int as n from marketplace_purchases')).rows[0].n,1);
    assert.equal((await db.query('select count(*)::int as n from credit_transactions')).rows[0].n,1);
    await db.exec('alter table marketplace_secrets rename column body to legacy_body');
    await assert.rejects(db.exec(migration), /Incompatible existing Marketplace table/);
    await db.exec('rollback; alter table marketplace_secrets rename column legacy_body to body');
    assert.equal((await db.query('select balance from credit_wallets')).rows[0].balance,123);
    console.log('PASS: migration/seed replay, preserved host records, balances and ownership; injected purchase failure rolls back debit, ownership and ledger.');
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
