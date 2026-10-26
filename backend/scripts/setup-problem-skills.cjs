// Optional catalogue setup for the three existing original problems. Dry-run by default.
// Never modifies profiles, attempts, scores, historical results or existing link weights.
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const catalogue = require('../../db/problem-code-review-skills.json');
process.loadEnvFile(path.resolve(__dirname, '../.env'));
const apply = process.argv.includes('--apply');
const check = result => { if (result.error) throw Error('Catalogue operation failed: ' + result.error.code); return result.data; };
(async () => {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const [skills, problems, categories, technologies] = await Promise.all([
    db.from('skills').select('id,name,slug,is_active').limit(1000),
    db.from('challenges').select('id,title').in('title', catalogue.problems.map(p => p.title)),
    db.from('skill_categories').select('id,slug').eq('slug', 'general').limit(1),
    db.from('technologies').select('id,name').eq('name', 'PostgreSQL'),
  ]).then(results => results.map(check));
  if (!categories.length || !technologies.length) throw Error('Existing General category and PostgreSQL technology are required.');
  if (problems.length !== catalogue.problems.length) throw Error('The three original problems must exist exactly once. No new problems will be created.');
  const ids = new Map(); let created = 0, linked = 0;
  for (const skill of catalogue.skills) {
    const bySlug = skills.find(s => s.slug === skill.slug);
    const byName = skills.find(s => s.name.trim().toLowerCase() === skill.name.toLowerCase());
    if (bySlug && byName && bySlug.id !== byName.id) throw Error('Conflicting skill name/slug: ' + skill.slug);
    let row = bySlug || byName;
    if (row && !row.is_active) throw Error('Restore or review the archived skill first: ' + skill.name);
    console.log((row ? 'Reuse skill: ' : 'Create skill: ') + skill.name);
    if (!row && apply) {
      row = check(await db.from('skills').insert({ name: skill.name, slug: skill.slug, description: skill.description,
        category_id: categories[0].id, technology_id: skill.technology ? technologies[0].id : null, is_active: true }).select('id').single());
      created++;
    }
    ids.set(skill.slug, row?.id);
  }
  for (const problem of catalogue.problems) {
    const matches = problems.filter(p => p.title === problem.title);
    if (matches.length !== 1) throw Error('Ambiguous problem: ' + problem.title);
    for (const slug of problem.skills) {
      console.log('Link: ' + problem.title + ' -> ' + slug);
      if (apply) { check(await db.from('challenge_skills').upsert({ challenge_id: matches[0].id, skill_id: ids.get(slug), weight: 1 }, { onConflict: 'challenge_id,skill_id', ignoreDuplicates: true })); linked++; }
    }
  }
  console.log(apply ? `Applied: ${created} new skills; ${linked} links ensured. Existing weights preserved.` : 'Dry run only. Add --apply to persist this catalogue setup.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
