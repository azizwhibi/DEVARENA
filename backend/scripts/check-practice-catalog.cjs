// Read-only catalog/schema audit. Never prints environment values or upstream errors.
const { existsSync } = require('node:fs');
const path = require('node:path');
const backend = path.resolve(__dirname, '..');
if (existsSync(path.join(backend, '.env'))) process.loadEnvFile(path.join(backend, '.env'));
require('ts-node').register({
  transpileOnly: true,
  project: path.join(backend, 'tsconfig.json'),
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', resolvePackageJsonExports: false },
});
const { getChallengeBankName, getChallengeQuestionBank } = require('../src/skills/scoring/challenge-grading.ts');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('missing_configuration');
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: require('ws') },
  });
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await db.from('challenges')
      .select('id,title,category,is_published,problem_type,challenge_skills(skills(id,name,slug))')
      .eq('is_published', true).order('id').range(offset, offset + 999);
    if (response.error) throw new Error('catalog_query_failed');
    rows.push(...response.data);
    if (response.data.length < 1000) break;
  }
  const bankCounts = {}, bankSizes = {}, categories = {}, unresolved = [], catalog = [];
  for (const row of rows) {
    const linkedSkills = (row.challenge_skills ?? []).flatMap((link) => link.skills ? [link.skills] : []);
    const skills = linkedSkills.map((skill) => `${skill.id} ${skill.name} ${skill.slug}`);
    const entry = { title: row.title, category: row.category, problemType: row.problem_type,
      skills: linkedSkills.map((skill) => skill.slug || skill.name) };
    categories[row.category ?? '(none)'] = (categories[row.category ?? '(none)'] ?? 0) + 1;
    try {
      const bank = getChallengeBankName(row.title, skills, row.category);
      const { questions } = getChallengeQuestionBank(row.title, skills, row.category);
      if (questions.length < 2 || new Set(questions.map((question) => question.question)).size !== questions.length)
        throw new Error('insufficient_distinct_content');
      if (questions.some((question) => question.options.some((option) => 'isCorrect' in option || 'explanation' in option)))
        throw new Error('private_grading_data_exposed');
      bankSizes[bank] = questions.length;
      bankCounts[bank] = (bankCounts[bank] ?? 0) + 1;
      catalog.push({ ...entry, bank });
    } catch {
      unresolved.push(entry);
      catalog.push({ ...entry, bank: null });
    }
  }
  const probes = [
    ['duel_matches', () => db.from('duel_matches').select('id,is_forfeit').limit(1)],
    ['user_rank_stats', () => db.from('user_rank_stats').select('duel_rating,matches_played').limit(1)],
    ['competitive_leaderboard', () => db.from('competitive_leaderboard').select('competitive_points').limit(1)],
    ['dev_scores', () => db.from('dev_scores').select('dev_score').limit(1)],
    ['competitive_rankings', () => db.rpc('competitive_rankings', {
      p_scope: 'global', p_value: null, p_search: null, p_limit: 1, p_offset: 0, p_user_id: null,
    })],
  ];
  const schema = await Promise.all(probes.map(async ([name, run]) => {
    const response = await run();
    return { name, status: response.status, errorCode: response.error?.code ?? null };
  }));
  console.log(JSON.stringify({ published: rows.length, resolved: rows.length - unresolved.length,
    unresolved: unresolved.length, bankCounts, bankSizes, categories, schema,
    ...(process.argv.includes('--details') ? { catalog } : {}) }, null, 2));
  if (process.argv.includes('--require-complete') && unresolved.length) process.exitCode = 1;
}
main().catch(() => {
  console.error('Catalog audit unavailable; check trusted backend configuration and connectivity.');
  process.exitCode = 1;
});
