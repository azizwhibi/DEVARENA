import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/lib/supabase/client') {
      return { url: 'mock:recovery-auth', shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'mock:recovery-auth') {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export function createClient() { return globalThis.recoveryTestClient; }',
      };
    }
    return nextLoad(url, context);
  },
});

try {
  const { requestPasswordReset, updatePassword } = await import('../src/lib/recovery.ts');

  let scenarios = 0;
  const resetCalls = [];
  const updateCalls = [];
  let signOutCalls = 0;

  globalThis.recoveryTestClient = {
    auth: {
      resetPasswordForEmail: async (email, options) => {
        resetCalls.push({ email, options });
        return { data: {}, error: null };
      },
      updateUser: async payload => {
        updateCalls.push(payload);
        return { data: { user: { id: 'test-user' } }, error: null };
      },
      signOut: async () => {
        signOutCalls++;
        return { error: null };
      },
    },
  };

  const base = 'http://localhost:3001';

  // 1. requestPasswordReset happy path
  await requestPasswordReset('  player@example.test  ', base);
  assert.equal(resetCalls.length, 1);
  assert.deepEqual(resetCalls.pop(), {
    email: 'player@example.test',
    options: { redirectTo: 'http://localhost:3001/auth/callback' },
  });
  scenarios++;

  // 2. Empty email ignored
  await requestPasswordReset('   ', base);
  assert.equal(resetCalls.length, 0);
  scenarios++;

  // 3. resetPasswordForEmail errors suppressed (enumeration resistance)
  globalThis.recoveryTestClient.auth.resetPasswordForEmail = async () => ({
    data: null,
    error: { message: 'User not found', status: 404 },
  });
  await assert.doesNotReject(async () => {
    await requestPasswordReset('unknown@example.test', base);
  });
  scenarios++;

  globalThis.recoveryTestClient.auth.resetPasswordForEmail = async () => {
    throw new Error('Network failure');
  };
  await assert.doesNotReject(async () => {
    await requestPasswordReset('unknown@example.test', base);
  });
  scenarios++;

  // 4. updatePassword validation: short password
  const shortRes = await updatePassword('1234567', '1234567');
  assert.equal(shortRes.error, 'Password must be at least eight characters.');
  assert.equal(updateCalls.length, 0);
  scenarios++;

  // 5. updatePassword validation: mismatch
  const mismatchRes = await updatePassword('new-password-1', 'new-password-2');
  assert.equal(mismatchRes.error, 'Passwords do not match.');
  assert.equal(updateCalls.length, 0);
  scenarios++;

  // 6. updatePassword happy path: updates and signs out
  globalThis.recoveryTestClient.auth.updateUser = async payload => {
    updateCalls.push(payload);
    return { data: { user: { id: 'test-user' } }, error: null };
  };
  const successRes = await updatePassword('strong-new-password', 'strong-new-password');
  assert.deepEqual(successRes, { success: true });
  assert.deepEqual(updateCalls.pop(), { password: 'strong-new-password' });
  assert.equal(signOutCalls, 1);
  scenarios++;

  // 7. updatePassword error from Supabase
  globalThis.recoveryTestClient.auth.updateUser = async () => ({
    data: null,
    error: { message: 'Token expired', status: 401 },
  });
  const errRes = await updatePassword('strong-new-password', 'strong-new-password');
  assert.match(errRes.error, /expired/i);
  scenarios++;

  // 7a. updatePassword error differentiation: weak password
  globalThis.recoveryTestClient.auth.updateUser = async () => ({
    data: null,
    error: { code: 'weak_password', message: 'Password is too weak' },
  });
  const weakRes = await updatePassword('strong-new-password', 'strong-new-password');
  assert.equal(weakRes.error, 'Choose a stronger password and try again.');
  scenarios++;

  // 7b. updatePassword error differentiation: rate limit (429)
  globalThis.recoveryTestClient.auth.updateUser = async () => ({
    data: null,
    error: { status: 429, message: 'Too many requests' },
  });
  const rateRes = await updatePassword('strong-new-password', 'strong-new-password');
  assert.equal(rateRes.error, 'Please wait before trying to update your password again.');
  scenarios++;

  // 7c. updatePassword non-fatal signOut error handling
  globalThis.recoveryTestClient.auth.updateUser = async () => ({
    data: { user: { id: 'test-user' } },
    error: null,
  });
  globalThis.recoveryTestClient.auth.signOut = async () => {
    throw new Error('SignOut network blip');
  };
  const signOutErrRes = await updatePassword('strong-new-password', 'strong-new-password');
  assert.deepEqual(signOutErrRes, { success: true });
  scenarios++;

  // 8. updatePassword connection failure
  globalThis.recoveryTestClient.auth.updateUser = async () => {
    throw new Error('Connection refused');
  };
  const throwRes = await updatePassword('strong-new-password', 'strong-new-password');
  assert.equal(throwRes.error, 'Unable to connect. Check your connection and try again.');
  scenarios++;

  // 9. Template validation for recovery.html
  const template = await readFile(new URL('../../supabase/templates/recovery.html', import.meta.url), 'utf8');
  assert.match(template, /<title>Reset your DevArena password<\/title>/);
  assert.match(template, /DEVARENA/);
  assert.ok(template.includes('token_hash={{ .TokenHash }}'), 'Contains token_hash placeholder');
  assert.ok(template.includes('type=recovery'), 'Contains type=recovery');
  assert.ok(template.includes('next=/reset-password'), 'Contains next=/reset-password');
  assert.ok(!template.includes('.ConfirmationURL'), 'Must not use legacy ConfirmationURL');

  // Verify synthesized URL
  const rendered = template
    .replaceAll('{{ .RedirectTo }}', base + '/auth/callback')
    .replaceAll('{{ .TokenHash }}', 'synthetic-recovery-hash');
  const href = rendered.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&');
  const link = new URL(href);
  assert.equal(link.origin, base);
  assert.equal(link.pathname, '/auth/callback');
  assert.equal(link.searchParams.get('token_hash'), 'synthetic-recovery-hash');
  assert.equal(link.searchParams.get('type'), 'recovery');
  assert.equal(link.searchParams.get('next'), '/reset-password');
  scenarios += 6;

  console.log(`PASS: ${scenarios} recovery scenarios (real helper, Auth SDK mocked, template verified)`);
} finally {
  delete globalThis.recoveryTestClient;
  hooks.deregister();
}
