import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/lib/supabase/client') {
      return { url: 'mock:oauth-auth', shortCircuit: true };
    }
    if (specifier === '@/lib/safe-next') {
      return nextResolve(new URL('../src/lib/safe-next.ts', import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'mock:oauth-auth') {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export function createClient() { return globalThis.oauthTestClient; }',
      };
    }
    return nextLoad(url, context);
  },
});

try {
  const { OAUTH_PROVIDERS, OAUTH_SCOPES, getOAuthRedirectUrl, signInWithProvider } = await import('../src/lib/oauth.ts');

  let scenarios = 0;

  // 1. Providers definition
  assert.equal(OAUTH_PROVIDERS.length, 2);
  assert.deepEqual(OAUTH_PROVIDERS.map(p => p.id), ['github', 'google']);
  assert.equal(OAUTH_SCOPES.github, 'read:user user:email');
  scenarios += 2;

  // 2. Redirect URL generation and sanitization
  const base = 'http://localhost:3001';
  assert.equal(getOAuthRedirectUrl(base, '/profile'), 'http://localhost:3001/auth/callback?next=%2Fprofile');
  assert.equal(getOAuthRedirectUrl(base, '/admin/users?page=1'), 'http://localhost:3001/auth/callback?next=%2Fadmin%2Fusers%3Fpage%3D1');
  assert.equal(getOAuthRedirectUrl(base, 'https://evil.com'), 'http://localhost:3001/auth/callback?next=%2F');
  assert.equal(getOAuthRedirectUrl(base, '//evil.com'), 'http://localhost:3001/auth/callback?next=%2F');
  assert.equal(getOAuthRedirectUrl(base, null), 'http://localhost:3001/auth/callback?next=%2F');
  assert.equal(getOAuthRedirectUrl(base, undefined), 'http://localhost:3001/auth/callback?next=%2F');
  scenarios += 6;

  // 3. Mocked sign in with provider
  const calls = [];
  globalThis.oauthTestClient = {
    auth: {
      signInWithOAuth: async payload => {
        calls.push(payload);
        return { data: { provider: payload.provider, url: 'https://provider.oauth' }, error: null };
      },
    },
  };

  const resGithub = await signInWithProvider('github', base, '/profile');
  assert.deepEqual(resGithub, {});
  assert.deepEqual(calls.pop(), {
    provider: 'github',
    options: {
      redirectTo: 'http://localhost:3001/auth/callback?next=%2Fprofile',
      scopes: 'read:user user:email',
    },
  });
  scenarios++;

  const resGoogle = await signInWithProvider('google', base, 'https://evil.com');
  assert.deepEqual(resGoogle, {});
  assert.deepEqual(calls.pop(), {
    provider: 'google',
    options: { redirectTo: 'http://localhost:3001/auth/callback?next=%2F' },
  });
  scenarios++;

  // 4. Provider error handling
  globalThis.oauthTestClient.auth.signInWithOAuth = async () => ({
    data: null,
    error: { message: 'Provider disabled', status: 400 },
  });
  const errRes = await signInWithProvider('github', base, '/');
  assert.equal(errRes.error, 'Unable to start sign-in with that provider. Try again.');
  scenarios++;

  // 5. Network / exception handling
  globalThis.oauthTestClient.auth.signInWithOAuth = async () => {
    throw new Error('Connection refused');
  };
  const throwRes = await signInWithProvider('google', base, '/');
  assert.equal(throwRes.error, 'Unable to connect. Check your connection and try again.');
  scenarios++;

  console.log(`PASS: ${scenarios} OAuth scenarios (real helper, Auth SDK mocked)`);
} finally {
  delete globalThis.oauthTestClient;
  hooks.deregister();
}
