// Trusted operator seed using the existing server environment. Dry-run unless --apply.
// Inserts drafts only; never overwrites existing reviewed resources or creates user activity.
const fs = require('node:fs'),
  path = require('node:path'),
  { parseEnv } = require('node:util');
const env = parseEnv(
  fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8'),
);
const input = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../db/knowledge-example-resources.json'),
    'utf8',
  ),
);
const apply = process.argv.includes('--apply');
async function request(route, init = {}) {
  const response = await fetch(env.SUPABASE_URL + '/rest/v1/' + route, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    let code = '';
    try {
      code = (await response.json()).code ?? '';
    } catch {}
    throw new Error('Knowledge seed HTTP ' + response.status + ' ' + code);
  }
  return response.json();
}
(async () => {
  const technologies = await request(
    'technologies?select=id,name,is_active&limit=1000',
  );
  const report = [];
  for (const item of input.resources) {
    const { technology_name, ...resource } = item;
    const query = new URLSearchParams({
      select: 'id,title,status',
      source: 'eq.' + resource.source,
      external_source_id: 'eq.' + resource.external_source_id,
    });
    const existing = await request('knowledge_resources?' + query);
    if (existing.length) {
      report.push({
        id: existing[0].id,
        title: existing[0].title,
        status: existing[0].status,
        result: 'existing-preserved',
      });
      continue;
    }
    const matches = technologies.filter(
      (tech) =>
        tech.is_active &&
        technology_name &&
        tech.name.toLowerCase() === technology_name.toLowerCase(),
    );
    const data = {
      ...resource,
      technology_id: matches.length === 1 ? matches[0].id : null,
    };
    if (!apply) {
      report.push({
        title: resource.title,
        status: 'draft',
        technology: matches.length === 1 ? matches[0].name : null,
        result: 'would-insert',
      });
      continue;
    }
    const result = await request('rpc/knowledge_save_resource', {
      method: 'POST',
      body: JSON.stringify({
        p_id: null,
        p_actor: null,
        p_data: data,
        p_skills: [],
      }),
    });
    const row = Array.isArray(result) ? result[0] : result;
    if (!row?.id || row.status !== 'draft')
      throw new Error('Unexpected seed response; stop before further writes.');
    report.push({
      id: row.id,
      title: row.title,
      status: row.status,
      technology: matches.length === 1 ? matches[0].name : null,
      result: 'inserted',
    });
  }
  console.log(
    JSON.stringify(
      { mode: apply ? 'apply' : 'dry-run', resources: report },
      null,
      2,
    ),
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
