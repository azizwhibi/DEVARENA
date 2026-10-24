// Isolated embedded PostgreSQL; never uses shared Supabase credentials.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {PGlite}=require('../../.local/verification/node_modules/@electric-sql/pglite');
(async()=>{const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create table public.profiles(id uuid primary key,username text,xp integer default 42);create table public.user_skill_progress(user_id uuid,score integer);');
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',match='33333333-3333-4333-8333-333333333333';
 await db.query('insert into profiles(id,username) values($1,$2),($3,$4)',[a,'Alice',b,'Bob']);await db.query('insert into user_skill_progress values($1,80)',[a]);
 const migration=fs.readFileSync('db/duel-integration.sql','utf8');await db.exec(migration);
 await db.query('insert into duel_matches(id,player1_id,player2_id,player1_score,winner_id) values($1,$2,$3,750,$2)',[match,a,b]);
 await db.exec(migration);assert.equal((await db.query('select player1_score from duel_matches')).rows[0].player1_score,750);
 assert.deepEqual((await db.query('select xp from profiles order by id')).rows.map(r=>r.xp),[42,42]);assert.equal((await db.query('select score from user_skill_progress')).rows[0].score,80);
 assert.equal((await db.query("select has_table_privilege('authenticated','public.duel_matches','INSERT') allowed")).rows[0].allowed,false);
 assert.equal((await db.query("select has_table_privilege('anon','public.duel_matches','SELECT') allowed")).rows[0].allowed,false);
 await db.query('delete from profiles where id=$1',[a]);const row=(await db.query('select * from duel_matches')).rows[0];assert.equal(row.player1_id,null);assert.equal(row.winner_id,null);assert.equal(row.player1_score,750);
 console.log('PASS: Battle migration replay, preserved profiles/XP/proficiency, backend-only privileges and anonymous historical scores after deletion.');
}finally{await db.close()}})().catch(error=>{console.error(error);process.exitCode=1});
