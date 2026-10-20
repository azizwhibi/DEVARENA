import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/lib/supabase/client') return { url: 'mock:registration-auth', shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'mock:registration-auth') return {
      format: 'module', shortCircuit: true,
      source: 'export function createClient() { return globalThis.registrationTestClient; }',
    };
    return nextLoad(url, context);
  },
});

try {
  const { register } = await import('../src/lib/register.ts');
  const calls = [];
  globalThis.registrationTestClient = { auth: { signUp: async payload => {
    calls.push(payload);
    return { data: { user: { id: 'test-user' }, session: null }, error: null };
  } } };
  function form() {
    const data = new FormData();
    data.set('email', '  player@example.test  ');
    data.set('password', 'a-safe-password');
    data.set('username', 'player_1');
    data.set('visibility', 'on');
    return data;
  }
  let scenarios = 0;
  assert.deepEqual(await register(form(), 'http://localhost:3001'), { signedIn: false });
  assert.deepEqual(calls.pop(), {
    email: 'player@example.test', password: 'a-safe-password',
    options: { emailRedirectTo: 'http://localhost:3001/auth/callback', data: { username: 'player_1', visibility: 'public' } },
  });
  scenarios++;

  const privateForm = form();
  privateForm.delete('visibility');
  privateForm.set('role', 'admin');
  privateForm.set('status', 'active');
  await register(privateForm, 'https://devarena.example');
  const payload = calls.pop();
  assert.deepEqual(payload.options.data, { username: 'player_1', visibility: 'private' });
  assert.equal(payload.options.emailRedirectTo, 'https://devarena.example/auth/callback');
  assert.deepEqual(Object.keys(payload).sort(), ['email', 'options', 'password']);
  scenarios++;

  const recruiterForm = form();
  recruiterForm.set('role', 'recruiter');
  assert.deepEqual(await register(recruiterForm, 'http://localhost:3001'), { signedIn: false, role: 'recruiter' });
  const recruiterPayload = calls.pop();
  assert.deepEqual(recruiterPayload.options.data, { username: 'player_1', visibility: 'public', role: 'recruiter' });
  assert.equal(recruiterPayload.options.emailRedirectTo, 'http://localhost:3001/auth/callback?next=/recruiter');
  scenarios++;

  const recruiterSignInForm = form();
  recruiterSignInForm.set('role', 'recruiter');
  globalThis.registrationTestClient.auth.signUp = async () => ({
    data: { session: { access_token: 'recruiter-token' } },
    error: null,
  });
  assert.deepEqual(await register(recruiterSignInForm, 'http://localhost:3001'), { signedIn: true, role: 'recruiter' });
  scenarios++;
  globalThis.registrationTestClient.auth.signUp = async payload => {
    calls.push(payload);
    return { data: { user: { id: 'test-user' }, session: null }, error: null };
  };

  for (const username of ['', 'ab', 'a'.repeat(25), 'with space', 'hyphen-name', '<script>', 'naïve', 'player\n']) {
    const data = form();
    data.set('username', username);
    const before = calls.length;
    assert.match((await register(data, 'http://localhost:3001')).error, /username/i);
    assert.equal(calls.length, before, 'Invalid username must not reach Auth');
    scenarios++;
  }
  for (const username of ['abc', 'Z_9', 'a'.repeat(24)]) {
    const data = form();
    data.set('username', username);
    assert.deepEqual(await register(data, 'http://localhost:3001'), { signedIn: false });
    assert.equal(calls.pop().options.data.username, username);
    scenarios++;
  }
  const shortPassword = form();
  shortPassword.set('password', '1234567');
  assert.match((await register(shortPassword, 'http://localhost:3001')).error, /eight/i);
  assert.equal(calls.length, 0);
  scenarios++;
  const minimumPassword = form();
  minimumPassword.set('password', '12345678');
  assert.deepEqual(await register(minimumPassword, 'http://localhost:3001'), { signedIn: false });
  calls.pop();
  scenarios++;
  const badEmail = form();
  badEmail.set('email', 'not-an-email');
  assert.match((await register(badEmail, 'http://localhost:3001')).error, /email/i);
  assert.equal(calls.length, 0);
  scenarios++;

  globalThis.registrationTestClient.auth.signUp = async () => ({ data: { session: null }, error: { code: 'user_already_exists', message: 'Sensitive provider detail' } });
  assert.deepEqual(await register(form(), 'http://localhost:3001'), { signedIn: false });
  scenarios++;
  globalThis.registrationTestClient.auth.signUp = async () => ({ data: { session: null }, error: { status: 429, message: 'Sensitive provider detail' } });
  assert.match((await register(form(), 'http://localhost:3001')).error, /wait/i);
  scenarios++;
  globalThis.registrationTestClient.auth.signUp = async () => ({ data: { session: null }, error: { code: 'weak_password', message: 'Sensitive provider detail' } });
  assert.match((await register(form(), 'http://localhost:3001')).error, /password/i);
  scenarios++;
  globalThis.registrationTestClient.auth.signUp = async () => ({ data: { session: null }, error: { message: 'Sensitive provider detail' } });
  const failure = await register(form(), 'http://localhost:3001');
  assert.match(failure.error, /try again/i);
  assert.ok(!failure.error.includes('Sensitive provider detail'));
  scenarios++;
  globalThis.registrationTestClient.auth.signUp = async () => { throw new Error('Sensitive transport detail'); };
  assert.match((await register(form(), 'http://localhost:3001')).error, /connection/i);
  scenarios++;
  globalThis.registrationTestClient.auth.signUp = async () => ({ data: { session: { access_token: 'synthetic-test-token' } }, error: null });
  assert.deepEqual(await register(form(), 'http://localhost:3001'), { signedIn: true });
  scenarios++;
  console.log(`PASS: ${scenarios} registration scenarios (real helper, Auth SDK mocked)`);
} finally {
  delete globalThis.registrationTestClient;
  hooks.deregister();
}
