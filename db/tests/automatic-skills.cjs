// Isolated PostgreSQL only. No credentials or shared Supabase access.
const fs = require('node:fs'),
  assert = require('node:assert/strict');
const {
  PGlite,
} = require('../../.local/verification/node_modules/@electric-sql/pglite');
(async () => {
  const db = new PGlite();
  const admin = '00000000-0000-4000-8000-000000000001';
  const developer = '00000000-0000-4000-8000-000000000002';
  const other = '00000000-0000-4000-8000-000000000003';
  try {
    await db.exec(
      'create role anon; create role authenticated; create role service_role bypassrls;',
    );
    await db.exec(
      fs
        .readFileSync('db/tests/fixtures/skills-host.sql', 'utf8')
        .replace(/^\uFEFF/, ''),
    );
    await db.exec(
      'alter table profiles add column status text default \'active\'; create table audit_log(actor_id uuid,target_id uuid,action text,"before" jsonb,"after" jsonb);',
    );
    await db.query(
      "insert into profiles(id,username,role) values($1,'Admin','admin'),($2,'Developer','developer'),($3,'Other','developer')",
      [admin, developer, other],
    );
    for (const file of [
      'skills-integration',
      'syrine-skills-data',
      'skills-management',
    ])
      await db.exec(fs.readFileSync('db/' + file + '.sql', 'utf8'));
    const skills = (
      await db.query('select id from skills order by id limit 3')
    ).rows.map((row) => row.id);
    const problems = (
      await db.query('select id from challenges order by id limit 3')
    ).rows.map((row) => row.id);
    await db.query(
      'delete from challenge_skills where challenge_id=any($1::uuid[])',
      [problems],
    );
    for (const [problem, skill] of [
      [problems[0], skills[0]],
      [problems[0], skills[1]],
      [problems[1], skills[0]],
      [problems[2], skills[2]],
    ]) {
      await db.query(
        'insert into challenge_skills(challenge_id,skill_id,weight) values($1,$2,2)',
        [problem, skill],
      );
    }
    await db.query('select skills_set_assignment($1,$2,$3,true)', [
      admin,
      developer,
      skills[2],
    ]);
    await db.query(
      "insert into user_skill_progress(user_id,skill_id,level_score,validated_attempts,status) values($1,$2,80,1,'advanced')",
      [developer, skills[2]],
    );
    await db.query(
      'insert into user_skill_history(user_id,skill_id,level_score,validated_attempts) values($1,$2,80,1)',
      [developer, skills[2]],
    );
    const snapshots = async () =>
      JSON.stringify(
        (await db.query('select * from user_skill_progress')).rows,
      ) +
      JSON.stringify((await db.query('select * from user_skill_history')).rows);
    const original = await snapshots();
    const insert = async (user, problem, validated) =>
      db.query(
        'insert into attempts(user_id,challenge_id,accuracy,is_validated) values($1,$2,$3,$4)',
        [user, problem, validated ? 1 : 0, validated],
      );
    await insert(developer, problems[2], false);
    await db.query(
      'insert into attempts(user_id,challenge_id,accuracy,is_validated,metadata) values($1,$2,1,false,$3::jsonb)',
      [
        developer,
        problems[2],
        JSON.stringify({ source: 'quiz_practice', practice_correct: true }),
      ],
    );
    const sql = fs.readFileSync('db/automatic-skills.sql', 'utf8');
    await db.exec(sql);
    const profile = async (user = developer) =>
      (
        await db.query(
          'select * from developer_demonstrated_skills where user_id=$1 order by id',
          [user],
        )
      ).rows;
    assert.equal(
      (await profile()).length,
      0,
      'Manual targets, legacy scores and failed practice do not award skills',
    );
    await insert(developer, problems[0], true);
    let earned = await profile();
    assert.equal(earned.length, 2, 'One result discovers every linked skill');
    assert.ok(earned.every((row) => row.solved_count === 1));
    await insert(developer, problems[0], true);
    assert.ok(
      (await profile()).every((row) => row.solved_count === 1),
      'Repeated accepted submissions count once',
    );
    await insert(developer, problems[1], true);
    earned = await profile();
    assert.equal(earned.find((row) => row.id === skills[0]).solved_count, 2);
    assert.equal(earned.find((row) => row.id === skills[1]).solved_count, 1);
    await db.query('select skills_set_assignment($1,$2,$3,false)', [
      admin,
      developer,
      skills[0],
    ]);
    assert.equal(
      (await profile()).length,
      2,
      'Removing a training target cannot remove demonstrated skills',
    );
    assert.equal(
      (await profile(other)).length,
      0,
      'A different developer has no inherited results',
    );
    await insert(other, problems[0], true);
    assert.equal((await profile(other)).length, 2);
    await db.query('update skills set is_active=false where id=$1', [
      skills[1],
    ]);
    assert.equal(
      (await profile()).find((row) => row.id === skills[1]).is_active,
      false,
      'Archived demonstrated skills preserve history',
    );
    await db.exec(sql);
    assert.equal(
      (await profile()).length,
      2,
      'Replay sees historical validated results without a backfill',
    );
    assert.equal(
      await snapshots(),
      original,
      'Discovery, repeats, replay and link removal never rewrite scores or history',
    );
    for (const role of ['anon', 'authenticated']) {
      assert.equal(
        (
          await db.query('select has_table_privilege($1, $2, $3) allowed', [
            role,
            'developer_demonstrated_skills',
            'SELECT',
          ])
        ).rows[0].allowed,
        false,
      );
      assert.equal(
        (
          await db.query('select has_table_privilege($1, $2, $3) allowed', [
            role,
            'attempts',
            'INSERT',
          ])
        ).rows[0].allowed,
        false,
      );
    }
    assert.equal(
      (
        await db.query(
          "select has_table_privilege('service_role','developer_demonstrated_skills','SELECT') allowed",
        )
      ).rows[0].allowed,
      true,
    );
    console.log(
      'PASS: automatic multi-skill discovery, distinct problem counts, failed/practice exclusion, manual-target independence, archived/historical results, user isolation, replay, no score/history mutation and service-only access.',
    );
  } finally {
    await db.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
