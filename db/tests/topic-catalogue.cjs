// Isolated PostgreSQL verification using the user's exported catalogue snapshots.
// No network, service keys or shared Supabase writes.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { PGlite } = require('../../.local/verification/node_modules/@electric-sql/pglite');

function csv(path) {
  const text = fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); if (row.some(v => v !== '')) rows.push(row);
      row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  assert.equal(quoted, false, 'Balanced CSV quoting');
  const columns = rows.shift();
  assert.ok(rows.every(r => r.length === columns.length));
  return { columns, rows };
}

(async () => {
  const db = new PGlite();
  const read = path => fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(read('db/tests/fixtures/skills-host.sql'));
    await db.exec("alter table profiles add column status text default 'active'; create table audit_log(actor_id uuid,target_id uuid,action text,\"before\" jsonb,\"after\" jsonb);");
    await db.exec(read('db/skills-integration.sql'));
    // The baseline creates a default category, but the user's snapshot owns its real ID.
    await db.exec('delete from skill_categories;');
    await db.exec(read('db/skills-management.sql'));
    await db.exec(read('db/problem-topics.sql'));
    await db.exec('alter table challenges add column problem_type text default \'quiz\', add column coding_version_id uuid, add column problem_slug text unique;');
    async function load(table, file) {
      const { columns, rows } = csv(file);
      assert.ok(columns.every(c => /^[a-z_]+$/.test(c)));
      for (const row of rows) await db.query(
        `insert into ${table}(${columns.map(c => '"' + c + '"').join(',')}) values(${columns.map((_,i) => '$' + (i+1)).join(',')})`,
        row.map((v,i) => v === '' ? null : columns[i] === 'is_active' || columns[i] === 'is_published' ? v === 'true' : v),
      );
    }
    for (const table of ['skill_categories', 'technologies', 'skills', 'topics'])
      await load(table, 'db/topics/' + table + '_rows.csv');
    await load('challenges', 'db/challenges_rows.csv');
    const originalSkill = (await db.query("select id,technology_id from skills where slug='arrays'")).rows[0];
    const originalSQL = (await db.query("select id from skills where slug='sql-joins'")).rows[0].id;
    const example = (await db.query("select id from challenges where title='JavaScript: First Matching Pair'")).rows[0].id;
    const developer = '00000000-0000-4000-8000-000000000002';
    await db.query("insert into profiles(id,username,role) values($1,'Existing developer','developer')", [developer]);
    await db.query('insert into challenge_skills(challenge_id,skill_id,weight) values($1,$2,3)', [example, originalSkill.id]);
    await db.query('insert into attempts(user_id,challenge_id,accuracy,is_validated) values($1,$2,0.67,true)', [developer, example]);
    await db.query("insert into user_skill_progress(user_id,skill_id,level_score,validated_attempts,status) values($1,$2,67,1,'intermediate')", [developer, originalSkill.id]);
    await db.query('insert into user_skill_history(user_id,skill_id,level_score,validated_attempts) values($1,$2,67,1)', [developer, originalSkill.id]);
    const tableSnapshot = async table => JSON.stringify((await db.query(`select * from ${table} order by id`)).rows);
    const protectedSnapshot = async () => JSON.stringify(await Promise.all([
      tableSnapshot('attempts'), tableSnapshot('user_skill_history'),
      db.query('select * from user_skill_progress order by user_id,skill_id').then(r => r.rows),
      tableSnapshot('challenges'), tableSnapshot('profiles'),
    ]));
    const protectedBefore = await protectedSnapshot();
    const originalSkills = await tableSnapshot('skills');
    const originalTechnologies = await tableSnapshot('technologies');
    const originalTopics = await tableSnapshot('topics');
    const permissions = async () => JSON.stringify((await db.query("select grantee,table_name,privilege_type from information_schema.role_table_grants where table_schema='public' order by grantee,table_name,privilege_type")).rows);
    const beforePermissions = await permissions();
    const seed = read('db/topics/01_fill_catalogue.sql');
    const links = read('db/topics/02_link_problems.sql');
    await db.exec(seed); await db.exec(links);
    assert.equal((await db.query('select count(*)::int n from skills')).rows[0].n, 84);
    assert.equal((await db.query('select count(*)::int n from topics')).rows[0].n, 27);
    assert.equal((await db.query('select count(*)::int n from skill_categories')).rows[0].n, 9);
    assert.equal((await db.query('select count(*)::int n from technologies')).rows[0].n, 16);
    const realTechnologies = (await db.query("select t.name,count(s.id)::int n from technologies t left join skills s on s.technology_id=t.id and s.is_active where t.name<>'sirine' group by t.id,t.name")).rows;
    assert.equal(realTechnologies.length, 15);
    assert.ok(realTechnologies.every(t => t.n >= 4), 'All fifteen real technology cards have active skills');
    assert.equal((await db.query("select id from skills where slug='sql-joins'")).rows[0].id, originalSQL, 'Shared IDs are reused');
    assert.equal((await db.query("select technology_id from skills where slug='arrays'")).rows[0].technology_id, null, 'Generic Arrays is not assigned to an arbitrary language');
    const priorSkillIds = JSON.parse(originalSkills).map(s => s.id);
    assert.equal(JSON.stringify((await db.query('select * from skills where id=any($1::uuid[]) order by id', [priorSkillIds])).rows), originalSkills, 'Existing complete classifications and metadata remain unchanged');
    assert.equal(await tableSnapshot('technologies'), originalTechnologies, 'Including C++ and C# with distinct existing UUID slugs');
    assert.equal(JSON.stringify((await db.query('select * from topics where id=any($1::uuid[]) order by id', [JSON.parse(originalTopics).map(t => t.id)])).rows), originalTopics);
    assert.equal((await db.query('select count(*)::int n from challenges c where exists(select 1 from challenge_topics t where t.challenge_id=c.id) and exists(select 1 from challenge_skills s where s.challenge_id=c.id)')).rows[0].n, 103);
    assert.equal((await db.query('select weight::int w from challenge_skills where challenge_id=$1 and skill_id=$2', [example, originalSkill.id])).rows[0].w, 3, 'Existing weights never reset');
    const counts = (await db.query('select problem_topic_counts(false) result')).rows[0].result;
    for (const topic of counts) {
      const actual = (await db.query('select count(*)::int n from challenge_topics ct join challenges c on c.id=ct.challenge_id where ct.topic_id=$1 and c.is_published', [topic.id])).rows[0].n;
      assert.equal(topic.problemCount, actual);
    }
    assert.equal(counts.find(t => t.slug === 'database').problemCount, 21, 'Twenty new SQL problems plus the original SQL problem');
    const catalogueSnapshot = async () => JSON.stringify(await Promise.all(['skill_categories','technologies','skills','topics'].map(tableSnapshot).concat([
      db.query('select * from challenge_topics order by challenge_id,topic_id').then(r => r.rows),
      db.query('select * from challenge_skills order by challenge_id,skill_id').then(r => r.rows),
    ])));
    const first = await catalogueSnapshot();
    await db.exec(seed); await db.exec(links);
    assert.equal(await catalogueSnapshot(), first, 'Replay is a no-op, including timestamps and link weights');
    assert.equal(await protectedSnapshot(), protectedBefore, 'No accounts, attempts, problems, proficiency or history changed');
    assert.equal(await permissions(), beforePermissions, 'RLS grants are not weakened');
    await db.exec("update skills set is_active=false where slug='rust-ownership';");
    await db.exec(seed);
    assert.equal((await db.query("select is_active from skills where slug='rust-ownership'")).rows[0].is_active, false, 'Archived skills stay archived');
    await db.exec("update skills set technology_id=null,category_id=null where slug='javascript-arrays';");
    await db.exec(seed);
    assert.equal((await db.query("select t.name from skills s join technologies t on t.id=s.technology_id where s.slug='javascript-arrays'")).rows[0].name, 'JavaScript', 'Missing association is repaired');
    await db.exec("insert into technologies(name,slug) values('Unrelated custom technology','nodejs');");
    const beforeConflict = await catalogueSnapshot();
    await assert.rejects(db.exec(seed), /Conflicting technology name\/slug/);
    await db.exec('rollback;');
    assert.equal(await catalogueSnapshot(), beforeConflict, 'Conflicting matches roll back the complete seed transaction');
    const customId = (await db.query("select id from skills where slug='sirine'")).rows[0].id;
    assert.equal((await db.query('select t.name from skills s join technologies t on t.id=s.technology_id where s.id=$1', [customId])).rows[0].name, 'React');
    await db.exec(read('db/topics/04_optional_link_sirine.sql'));
    await db.exec(read('db/topics/04_optional_link_sirine.sql'));
    assert.equal((await db.query('select t.name from skills s join technologies t on t.id=s.technology_id where s.id=$1', [customId])).rows[0].name, 'sirine');
    assert.equal(await protectedSnapshot(), protectedBefore, 'The optional custom correction also preserves scores and history');
    await db.exec(read('db/topics/03_verify_catalogue.sql'));
    console.log('PASS: four exported tables, 15 populated technology cards, 82 catalogue skills, 27 topics, all 103 problems linked, ID/weight reuse, replay, exact published counts, archived/custom preservation, missing-link repair, conflict rollback, unchanged permissions/accounts/attempts/proficiency/history, optional Sirine correction.');
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
