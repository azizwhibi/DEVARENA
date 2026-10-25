import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/lib/supabase/client') return { url: 'mock:skills-auth', shortCircuit: true };
    if (specifier.startsWith('@/')) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'mock:skills-auth') return { format: 'module', shortCircuit: true,
      source: "export function createClient() { return { auth: { getSession: async () => ({ data: { session: { access_token: 'signed-in-token' } } }) } }; }" };
    return nextLoad(url, context);
  },
});
const { ApiService } = await import('../src/lib/skills/api.ts');
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalApi = process.env.NEXT_PUBLIC_API_URL;
process.env.NEXT_PUBLIC_API_URL = 'https://api.example.invalid';
const failures = [];
globalThis.window = { dispatchEvent(event) { failures.push(event.detail); } };
let scenarios = 0;
function respond(handler) {
  globalThis.fetch = async (url, init) => {
    assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer signed-in-token');
    assert.equal(init.cache, 'no-store');
    return handler(new URL(url), init);
  };
}
try {
  respond(url => Response.json(url.pathname === '/me/skills' ? [] : []));
  assert.deepEqual(await ApiService.getMySkills(), []);
  scenarios++;

  respond(url => Response.json(url.pathname === '/me/skills' ? [] : [{ id: 'skill-a', name: 'React', slug: 'react', category: { name: 'Frontend' }, technology: { name: 'React' } }]));
  const newUser = await ApiService.getMySkills();
  assert.equal(newUser[0].levelScore, null);
  assert.equal(newUser[0].status, 'not_evaluated');
  assert.equal(newUser[0].category, 'Frontend');
  scenarios++;

  respond(url => Response.json(url.pathname === '/me/skills' ? [
    { skill_id: 'skill-a', level_score: 0, status: 'not_evaluated', validated_attempts: 0 },
  ] : [{ id: 'skill-a', name: 'React' }]));
  assert.equal((await ApiService.getMySkills())[0].levelScore, null);
  scenarios++;

  respond(() => Response.json({ status: 403, detail: 'Forbidden' }, { status: 403 }));
  await assert.rejects(ApiService.toggleSkillActive('skill-a', false), { status: 403 });
  assert.equal(failures.at(-1), 'Forbidden');
  scenarios++;

  respond(() => { throw new TypeError('Network unavailable'); });
  await assert.rejects(ApiService.getMySkills(), /Network unavailable/);
  scenarios++;

  respond((url, init) => {
    if (init.method !== 'PUT') return Response.json({ skills: [{ id: 'existing', weight: 1 }] });
    assert.deepEqual(JSON.parse(init.body), { skills: [{ skillId: 'existing', weight: 1 }, { skillId: 'new', weight: 2 }] });
    return Response.json({ ok: true });
  });
  await ApiService.setChallengeSkills('challenge-a', [{ skillId: 'new', weight: 2 }]);
  scenarios++;

  respond((url, init) => {
    if (url.pathname === '/me') return Response.json({ id: 'current-account' });
    assert.equal(url.pathname, '/admin/progress/users/current-account/skills/skill-a/recalculate');
    assert.equal(init.method, 'POST');
    return Response.json({ recalculated: true });
  });
  await ApiService.recalculateProgress('skill-a');
  scenarios++;

  respond(() => Response.json([{ id: 'skill-a', name: 'React', category: { id: 'category-a', name: 'Frontend' }, technology: { id: 'technology-a', name: 'React' } }]));
  const editable = (await ApiService.getAdminSkills())[0];
  assert.equal(editable.categoryId, 'category-a');
  assert.equal(editable.technologyId, 'technology-a');
  scenarios++;

  respond((url, init) => {
    assert.equal(url.pathname, '/admin/skills/skill-a');
    assert.equal(init.method, 'PATCH');
    assert.deepEqual(JSON.parse(init.body), { name: 'Updated skill', categoryId: 'category-a', technologyId: null, description: '' });
    return Response.json({ id: 'skill-a', name: 'Updated skill', category_id: 'category-a', technology_id: null, is_active: false });
  });
  const edited = await ApiService.updateSkill('skill-a', { name: 'Updated skill', categoryId: 'category-a', technologyId: null, description: '' });
  assert.equal(edited.name, 'Updated skill');
  assert.equal(edited.categoryId, 'category-a');
  assert.equal(edited.technologyId, null);
  assert.equal(edited.isActive, false);
  scenarios++;

  respond(() => Response.json({ status: 403, detail: 'Forbidden' }, { status: 403 }));
  await assert.rejects(ApiService.updateSkill('skill-a', { name: 'Denied', categoryId: 'category-a', technologyId: null, description: '' }), { status: 403 });
  scenarios++;

  respond(url => {
    assert.equal(url.pathname, '/technologies', 'Technology discovery must not depend on personal progress');
    return Response.json([{ id: 'empty-tech', name: 'Rust' }]);
  });
  assert.deepEqual(await ApiService.getTechnologies(), [{ id: 'empty-tech', name: 'Rust' }]);
  scenarios++;

  const pages = [];
  respond(url => {
    assert.equal(url.pathname, '/skills');
    assert.equal(url.searchParams.get('technology'), 'technology-a');
    const page = Number(url.searchParams.get('page')); pages.push(page);
    return Response.json({ items: [{ id: `s${page}`, name: `Skill ${page}`, technology: { id: 'technology-a', name: 'React' } }], total: 2 });
  });
  const technologySkills = await ApiService.getTechnologySkills('technology-a');
  assert.deepEqual(pages, [1, 2]);
  assert.equal(technologySkills.length, 2);
  assert.equal(technologySkills[0].technologyId, 'technology-a');
  scenarios++;

  respond(() => Response.json({ detail: 'Catalogue unavailable' }, { status: 500 }));
  await assert.rejects(ApiService.getTechnologies(), { status: 500 });
  await assert.rejects(ApiService.getTechnologySkills('technology-a'), { status: 500 });
  scenarios++;

  respond(url => Response.json(url.pathname === '/me/skills'
    ? [{ skill_id: 'retired-assignment', level_score: 80, validated_attempts: 1, status: 'advanced' }]
    : []));
  assert.deepEqual(await ApiService.getMySkills(), [], 'Unassigned historical skills must not become active assignments');
  scenarios++;

  respond(url => Response.json(url.pathname === '/me/skills'
    ? [{ skill_id: 'retired-assignment', level_score: 80, validated_attempts: 1, status: 'advanced' }]
    : { id: 'retired-assignment', name: 'SQL', technology: { name: 'PostgreSQL' } }));
  const preserved = await ApiService.getSkillDetail('retired-assignment');
  assert.equal(preserved.levelScore, 80); assert.equal(preserved.technology, 'PostgreSQL');
  scenarios++;

  respond((url, init) => {
    assert.equal(url.pathname, '/admin/developers/developer-a/skills/skill-a');
    assert.equal(init.method, 'POST'); assert.ok(!init.body, 'Assignment must never send a score');
    return Response.json([]);
  });
  await ApiService.setDeveloperSkill('developer-a', 'skill-a', true);
  scenarios++;

  respond((url, init) => {
    assert.equal(init.method, 'PUT');
    assert.deepEqual(JSON.parse(init.body), { skills: [] });
    return Response.json({ skills: [] });
  });
  await ApiService.replaceChallengeSkills('challenge-a', []);
  scenarios++;

  console.log(`PASS: ${scenarios} skill integration scenarios (session token, technology catalogue, pagination, empty progress, errors, associations and current account).`);
} finally {
  hooks.deregister();
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
  if (originalApi === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApi;
}
