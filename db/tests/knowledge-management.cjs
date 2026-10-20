// Isolated PostgreSQL fixture; never connects to the live Supabase project.
const fs = require("node:fs"),
  assert = require("node:assert/strict");
const {
  PGlite,
} = require("../../.local/verification/node_modules/@electric-sql/pglite");
const user = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002",
  skill = "00000000-0000-4000-8000-000000000003";
(async () => {
  const db = new PGlite();
  let checks = 0;
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table profiles(id uuid primary key,username text);create table technologies(id uuid primary key,name text,is_active boolean default true);create table skills(id uuid primary key,name text,is_active boolean default true,technology_id uuid references technologies(id));create table challenges(id uuid primary key,title text,difficulty text);
 create table knowledge_resources(id uuid primary key default gen_random_uuid(),title text,content text);
 insert into knowledge_resources(title,content) values('Legacy notes','Preserve this text');`);
    await db.query("insert into profiles values ($1,$2),($3,$4)", [
      user,
      "existing-user",
      other,
      "second-user",
    ]);
    await db.query("insert into skills(id,name) values ($1,$2)", [
      skill,
      "SQL joins",
    ]);
    await db.exec(fs.readFileSync("db/skills-integration.sql", "utf8"));
    const migration = fs.readFileSync("db/knowledge-management.sql", "utf8");
    await db.exec(migration);
    await db.exec(migration);
    assert.equal(
      (
        await db.query(
          "select content from knowledge_resources where title='Legacy notes'",
        )
      ).rows[0].content,
      "Preserve this text",
    );
    checks++;
    assert.equal(
      (await db.query("select count(*)::int as n from profiles")).rows[0].n,
      2,
    );
    checks++;
    const privilege = await db.query(
      "select has_table_privilege('authenticated','knowledge_resources','SELECT') as direct,has_function_privilege('anon','knowledge_save_activity(uuid,uuid,text,integer)','EXECUTE') as rpc",
    );
    assert.deepEqual(privilege.rows[0], { direct: false, rpc: false });
    checks++;
    const created = await db.query(
      "select (knowledge_save_resource(null,$1,$2::jsonb,$3::uuid[])).id",
      [
        user,
        JSON.stringify({
          title: "SQL notes",
          content: "A reviewed explanation.",
        }),
        [skill],
      ],
    );
    const resource = created.rows[0].id;
    await assert.rejects(
      db.query("select knowledge_save_activity($1,$2,$3,0)", [
        user,
        resource,
        "bookmark",
      ]),
    );
    checks++;
    await db.query(
      "update knowledge_resources set status='published',published_at=now() where id=$1",
      [resource],
    );
    for (let i = 0; i < 2; i++)
      await db.query("select knowledge_save_activity($1,$2,'bookmark',0)", [
        user,
        resource,
      ]);
    assert.equal(
      (await db.query("select count(*)::int n from knowledge_bookmarks"))
        .rows[0].n,
      1,
    );
    checks++;
    await db.query("select knowledge_save_activity($1,$2,'bookmark',0)", [
      other,
      resource,
    ]);
    await db.query(
      "delete from knowledge_bookmarks where user_id=$1 and resource_id=$2",
      [user, resource],
    );
    assert.equal(
      (await db.query("select user_id from knowledge_bookmarks")).rows[0]
        .user_id,
      other,
    );
    checks++;
    await db.query("select knowledge_save_activity($1,$2,'progress',0)", [
      user,
      resource,
    ]);
    let progress = (await db.query("select * from knowledge_progress")).rows[0];
    assert.equal(progress.state, "started");
    assert.equal(progress.completed_at, null);
    const started = progress.started_at;
    checks++;
    await db.query("select knowledge_save_activity($1,$2,'progress',100)", [
      user,
      resource,
    ]);
    progress = (await db.query("select * from knowledge_progress")).rows[0];
    assert.equal(progress.state, "completed");
    assert.equal(progress.percentage, 100);
    assert.ok(progress.completed_at);
    checks++;
    const completed = progress.completed_at;
    await db.query("select knowledge_save_activity($1,$2,'progress',100)", [
      user,
      resource,
    ]);
    assert.deepEqual(
      (await db.query("select completed_at from knowledge_progress")).rows[0]
        .completed_at,
      completed,
    );
    checks++;
    await db.query("select knowledge_save_activity($1,$2,'progress',50)", [
      user,
      resource,
    ]);
    progress = (await db.query("select * from knowledge_progress")).rows[0];
    assert.equal(progress.completed_at, null);
    assert.deepEqual(progress.started_at, started);
    assert.equal(progress.state, "started");
    checks++;
    await assert.rejects(
      db.query("select knowledge_save_activity($1,$2,'progress',101)", [
        user,
        resource,
      ]),
    );
    checks++;
    const empty = (
      await db.query(
        "select (knowledge_save_resource(null,$1,$2::jsonb,null)).id",
        [user, JSON.stringify({ title: "Empty draft" })],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query(
        "update knowledge_resources set status='published',published_at=now() where id=$1",
        [empty],
      ),
    );
    checks++;
    await assert.rejects(
      db.query("update knowledge_resources set external_url=$1 where id=$2", [
        "javascript:alert(1)",
        empty,
      ]),
    );
    checks++;
    await assert.rejects(
      db.query("select knowledge_save_resource($1,$2,$3::jsonb,$4::uuid[])", [
        resource,
        user,
        JSON.stringify({ title: "Partial change" }),
        ["99999999-0000-4000-8000-000000000001"],
      ]),
    );
    assert.equal(
      (
        await db.query("select title from knowledge_resources where id=$1", [
          resource,
        ])
      ).rows[0].title,
      "SQL notes",
    );
    checks++;
    await db.query(
      "select knowledge_save_resource($1,$2,$3::jsonb,$4::uuid[])",
      [resource, user, JSON.stringify({ description: "Edited" }), []],
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from knowledge_resource_skills where resource_id=$1",
          [resource],
        )
      ).rows[0].n,
      0,
    );
    checks++;
    await db.query(
      "update knowledge_resources set status='archived' where id=$1",
      [resource],
    );
    await assert.rejects(
      db.query("select knowledge_save_activity($1,$2,'progress',100)", [
        user,
        resource,
      ]),
    );
    checks++;
    const imported = JSON.stringify({
      title: "Imported title",
      source: "coursera",
      external_source_id: "stable-source",
      external_url: "https://www.coursera.org/learn/example",
    });
    await db.query("select knowledge_save_resource(null,$1,$2::jsonb,null)", [
      user,
      imported,
    ]);
    await assert.rejects(
      db.query("select knowledge_save_resource(null,$1,$2::jsonb,null)", [
        user,
        imported,
      ]),
    );
    checks++;
    const examples = fs.readFileSync(
      "db/knowledge-example-resources.sql",
      "utf8",
    );
    await db.query("insert into technologies(id,name) values ($1,$2)", [
      other,
      "React",
    ]);
    const activityBefore = (
      await db.query("select count(*)::int n from knowledge_progress")
    ).rows[0].n;
    await db.exec(examples);
    const sampleRows = (
      await db.query(
        "select * from knowledge_resources where source='devarena' order by external_source_id",
      )
    ).rows;
    assert.equal(sampleRows.length, 4);
    assert.ok(
      sampleRows.every(
        (row) =>
          row.status === "draft" &&
          row.content.length > 300 &&
          row.created_by === null &&
          row.estimated_minutes === null,
      ),
    );
    checks++;
    assert.equal(
      sampleRows.find((row) => row.title === "Gérer un état avec React")
        .technology_id,
      other,
    );
    assert.equal(
      sampleRows.find((row) => row.title === "Créer une branche Git")
        .technology_id,
      null,
    );
    checks++;
    await db.query(
      "update knowledge_resources set title='Reviewed title' where external_source_id='devarena-example-react-state-v1'",
    );
    await db.exec(examples);
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from knowledge_resources where source='devarena'",
        )
      ).rows[0].n,
      4,
    );
    assert.equal(
      (
        await db.query(
          "select title from knowledge_resources where external_source_id='devarena-example-react-state-v1'",
        )
      ).rows[0].title,
      "Reviewed title",
    );
    checks++;
    assert.equal(
      (await db.query("select count(*)::int n from knowledge_progress")).rows[0]
        .n,
      activityBefore,
    );
    checks++;
    const publishExamples=fs.readFileSync('db/publish-knowledge-examples.sql','utf8');
    await db.exec(publishExamples);
    const publishedExamples=(await db.query("select id,published_at from knowledge_resources where source='devarena' and status='published' order by id")).rows;
    assert.equal(publishedExamples.length,4);checks++;
    assert.equal((await db.query("select status from knowledge_resources where source='coursera' and external_source_id='stable-source'")).rows[0].status,'draft');checks++;
    await db.exec(publishExamples);
    assert.deepEqual((await db.query("select id,published_at from knowledge_resources where source='devarena' and status='published' order by id")).rows,publishedExamples);checks++;
    console.log(
      "PASS: " +
        checks +
        " Knowledge PostgreSQL checks (migration replay, legacy preservation, grants, publication, atomic links, bookmarks, progress and archive access).",
    );
  } finally {
    await db.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
