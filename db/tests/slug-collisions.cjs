// Install the isolated verifier with:
// npm install --prefix .local/verification --no-save --package-lock=false @electric-sql/pglite
// Run from the repository root: node db/tests/slug-collisions.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require('../../.local/verification/node_modules/@electric-sql/pglite');

const duplicateId = 'b0000000-0000-4000-8000-000000000002';
const rows = [
  ['a0000000-0000-4000-8000-000000000001', 'C++', null],
  ['a0000000-0000-4000-8000-000000000002', 'C#', null],
  ['b0000000-0000-4000-8000-000000000001', 'First duplicate', 'shared'],
  [duplicateId, 'Second duplicate', 'shared'],
  ['c0000000-0000-4000-8000-000000000001', 'Occupied candidate', `shared-${duplicateId}`],
  ['d0000000-0000-4000-8000-000000000001', 'Keep existing', 'keep-this-slug'],
  ['e0000000-0000-4000-8000-000000000001', 'Whitespace slug', '   '],
  ['f0000000-0000-4000-8000-000000000001', '!!!', null],
];

(async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create table public.profiles(id uuid primary key, username text);
      insert into public.profiles values ('00000000-0000-4000-8000-000000000001','existing-account');
      create table public.technologies(id uuid primary key, name text not null unique, slug text, is_active boolean default true);
      create table public.skills(id uuid primary key, name text not null, slug text, technology_id uuid references public.technologies(id), is_active boolean default true);
      create table public.challenges(id uuid primary key, title text not null, difficulty text not null);
    `);
    for (const row of rows) {
      await db.query('insert into public.technologies(id,name,slug) values ($1,$2,$3)', row);
      await db.query('insert into public.skills(id,name,slug,technology_id) values ($1,$2,$3,$1)', row);
    }
    const oldCollision = await db.query(`
      select trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) || '-' || left(id::text,8) as slug
      from public.technologies where name in ('C++','C#') order by id
    `);
    assert.deepEqual(oldCollision.rows.map(row => row.slug), ['c-a0000000', 'c-a0000000']);
    const before = await db.query('select id,name,technology_id from public.skills order by id');
    const accounts = await db.query('select * from public.profiles');
    const migration = fs.readFileSync(path.join(__dirname, '..', 'skills-integration.sql'), 'utf8');
    await db.exec(migration);
    for (const table of ['technologies', 'skills']) {
      const result = await db.query(`select id,slug from public.${table} order by id`);
      const slugs = result.rows.map(row => row.slug);
      assert.equal(slugs.length, rows.length);
      assert.equal(new Set(slugs).size, rows.length);
      assert.ok(slugs.every(slug => slug && slug.trim()));
      assert.equal(result.rows[2].slug, 'shared');
      assert.equal(result.rows[3].slug, `shared-${duplicateId}-1`);
      assert.equal(result.rows[4].slug, `shared-${duplicateId}`);
      assert.equal(result.rows[5].slug, 'keep-this-slug');
    }
    assert.deepEqual(await db.query('select id,name,technology_id from public.skills order by id'), before);
    assert.deepEqual(await db.query('select * from public.profiles'), accounts);
    const stable = await db.query('select id,slug from public.technologies order by id');
    await db.exec(migration);
    assert.deepEqual(await db.query('select id,slug from public.technologies order by id'), stable);

    // Retry with an already-existing unique index and an occupied generated slug.
    const nullId = rows[0][0];
    const occupied = stable.rows[0].slug;
    await db.query('update public.technologies set slug = null where id = $1', [nullId]);
    await db.query('insert into public.technologies(id,name,slug) values ($1,$2,$3)', ['90000000-0000-4000-8000-000000000001', 'Custom slug owner', occupied]);
    await db.exec(migration);
    const repaired = await db.query('select slug from public.technologies where id = $1', [nullId]);
    assert.equal(repaired.rows[0].slug, occupied + '-1');
    assert.deepEqual(await db.query('select * from public.profiles'), accounts);
    console.log('PASS: shared UUID prefixes, duplicate/blank/custom slugs, existing unique indexes, replay, row IDs, technology links and accounts.');
  } finally {
    await db.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
