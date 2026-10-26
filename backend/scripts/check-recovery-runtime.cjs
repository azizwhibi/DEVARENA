// Development verification: creates two isolated auth fixtures, then deletes them.
// No credentials, session tokens, user responses, or upstream error bodies are logged.
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const backend = path.resolve(__dirname, '..');
process.loadEnvFile(path.join(backend, '.env'));
require('ts-node').register({ transpileOnly: true, project: path.join(backend, 'tsconfig.json'),
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', resolvePackageJsonExports: false } });
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const { getChallengeBankName } = require('../src/skills/scoring/challenge-grading.ts');
const { QUESTION_BANKS } = require('../src/skills/scoring/practice-questions.ts');
const { DEFAULT_DUEL_QUESTIONS } = require('../src/duel/duel.constants.ts');
const options = { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocket } };
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const base = 'http://localhost:3000';
const fixtures = [], summary = { questionBanks: 0, wrongAnswerSaved: false, duelOutcomes: 0, rankingStatuses: [], cleaned: 0 };

async function api(fixture, route, init = {}) {
  return fetch(base + route, { ...init, headers: {
    Authorization: `Bearer ${fixture.token}`, 'Content-Type': 'application/json',
  }, signal: AbortSignal.timeout(10000) });
}

async function match() {
  const sockets = [];
  try {
    await new Promise((resolve, reject) => {
      const done = new Set();
      const timeout = setTimeout(() => reject(new Error('duel_timeout')), 45000);
      for (const [index, fixture] of fixtures.entries()) {
        const socket = new WebSocket(base.replace('http:', 'ws:') + '/duel', { origin: 'http://localhost:3001' });
        sockets.push(socket);
        socket.on('error', () => { clearTimeout(timeout); reject(new Error('duel_connection')); });
        socket.on('open', () => socket.send(JSON.stringify({ type: 'DUEL_AUTH', payload: { token: fixture.token } })));
        socket.on('message', (raw) => {
          const message = JSON.parse(String(raw));
          const send = (type, payload) => socket.send(JSON.stringify({ type, payload }));
          if (message.type === 'DUEL_AUTHENTICATED') send('DUEL_JOIN');
          if (message.type === 'DUEL_MATCH_PROPOSED') send('DUEL_MATCH_ACCEPT', { duelId: message.payload.duelId });
          if (message.type === 'DUEL_ROUND_START') {
            const q = DEFAULT_DUEL_QUESTIONS.find((q) => q.id === message.payload.question.id);
            if (!q) { clearTimeout(timeout); reject(new Error('unknown_duel_question')); return; }
            send('DUEL_SUBMIT_ANSWER', { duelId: message.payload.duelId, roundIndex: message.payload.roundIndex,
              questionId: q.id, selectedIndex: index === 0 ? q.correctIndex : (q.correctIndex + 1) % 4 });
          }
          if (message.type === 'DUEL_MATCH_END') summary.duelOutcomes++;
          if (message.type === 'DUEL_RATING_UPDATED' ||
              (message.type === 'DUEL_RATING_STATUS' && message.payload.status === 'failed')) {
            summary.rankingStatuses.push(message.type === 'DUEL_RATING_UPDATED' ? 'saved' : message.payload.code);
            done.add(index);
            if (done.size === fixtures.length) { clearTimeout(timeout); resolve(); }
          }
          if (message.type === 'DUEL_ERROR') { clearTimeout(timeout); reject(new Error('duel_rejected')); }
        });
      }
    });
  } finally {
    for (const socket of sockets) socket.close();
  }
}

async function main() {
  const config = new URL(process.env.SUPABASE_URL);
  if (config.hostname !== 'qorlygdcfwnrrzvzulcz.supabase.co') throw new Error('wrong_development_target');
  try {
    for (let i = 0; i < 2; i++) {
      const suffix = randomBytes(6).toString('hex');
      const email = `recovery_${suffix}@example.com`, password = randomBytes(24).toString('base64url') + 'Aa1!';
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true,
        user_metadata: { username: `recovery_${suffix}` } });
      if (created.error || !created.data.user) throw new Error('fixture_creation_failed');
      const fixture = { id: created.data.user.id, token: null, username: null };
      fixtures.push(fixture);
      const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
      const login = await client.auth.signInWithPassword({ email, password });
      if (login.error || !login.data.session) throw new Error('fixture_auth_failed');
      fixture.token = login.data.session.access_token;
      const profile = await api(fixture, '/me/profile');
      if (profile.status !== 200) throw new Error('authenticated_profile_failed');
      fixture.username = (await profile.json()).username;
    }
    const catalog = await admin.from('challenges')
      .select('id,title,category,challenge_skills(skills(name,slug))').eq('is_published', true);
    if (catalog.error) throw new Error('catalog_failed');
    const sampled = new Map();
    for (const row of catalog.data) {
      const skills = (row.challenge_skills ?? []).flatMap((link) => link.skills ? [link.skills.name, link.skills.slug] : []);
      const bank = getChallengeBankName(row.title, skills, row.category);
      if (!sampled.has(bank)) sampled.set(bank, row);
    }
    for (const [bank, row] of sampled) {
      const response = await api(fixtures[0], `/me/skills/challenges/${row.id}/question-bank`);
      if (response.status !== 200) throw new Error('question_bank_http_failed');
      const content = await response.json();
      if (content.bank !== bank || content.questions?.length < 2 ||
          content.questions.some((q) => q.options.some((option) => 'isCorrect' in option)))
        throw new Error('question_bank_contract_failed');
      summary.questionBanks++;
    }
    const [bank, row] = sampled.entries().next().value;
    const question = QUESTION_BANKS[bank][0], wrong = question.options.find((option) => !option.isCorrect);
    const attempt = await api(fixtures[0], `/me/skills/challenges/${row.id}/attempt`, { method: 'POST',
      body: JSON.stringify({ question: question.question, answerId: wrong.id }) });
    if (attempt.status !== 200 || (await attempt.json()).isSuccess !== false) throw new Error('server_grading_failed');
    summary.wrongAnswerSaved = true;
    await match();
  } finally {
    for (const fixture of fixtures) {
      if (fixture.token && fixture.username) {
        const response = await api(fixture, '/me', { method: 'DELETE', body: JSON.stringify({ confirmUsername: fixture.username }) });
        if (response.status === 204) { summary.cleaned++; continue; }
      }
      // These fixtures never own storage blobs. Audit before the trusted Auth deletion.
      const audit = await admin.from('audit_log').insert({ actor_id: fixture.id, target_id: fixture.id,
        action: 'recovery_test_fixture_cleanup', before: null, after: null });
      if (!audit.error && !(await admin.auth.admin.deleteUser(fixture.id)).error) summary.cleaned++;
    }
    console.log(JSON.stringify(summary));
  }
}
main().catch(() => { console.error('Authenticated recovery verification incomplete; see sanitized counts/statuses above.'); process.exitCode = 1; });
