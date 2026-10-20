import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { DEMO_ACCOUNTS, resolveRoleDestination } = await import('../src/lib/role-login.ts');

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('Running role-based sign-in automated verification...');

// 1. Role-aware redirection destination logic
async function testRoleDestinations() {
  // Explicit destination takes precedence
  const explicit = await resolveRoleDestination('/profile/settings', async () => 'admin');
  assert.equal(explicit, '/profile/settings', 'Explicit safe next path must take precedence');

  const explicitAdmin = await resolveRoleDestination('/admin/users', async () => 'recruiter');
  assert.equal(explicitAdmin, '/admin/users', 'Explicit safe admin path must be respected');

  // Unsafe / external destination falls back to role-based destination
  const unsafeAdmin = await resolveRoleDestination('https://evil.com', async () => 'admin');
  assert.equal(unsafeAdmin, '/admin/users', 'Unsafe target defaults to admin hub for admin');

  const unsafeRecruiter = await resolveRoleDestination('//evil.com', async () => 'recruiter');
  assert.equal(unsafeRecruiter, '/recruiter', 'Unsafe target defaults to recruiter portal for recruiter');

  // Default '/' destination resolves to persona hub
  const adminDest = await resolveRoleDestination('/', async () => 'admin');
  assert.equal(adminDest, '/admin/users', 'Admin default destination must be /admin/users');

  const recruiterDest = await resolveRoleDestination('/', async () => 'recruiter');
  assert.equal(recruiterDest, '/recruiter', 'Recruiter default destination must be /recruiter');

  const developerDest = await resolveRoleDestination('/', async () => 'developer');
  assert.equal(developerDest, '/profile', 'Developer default destination must be /profile');

  // Empty or undefined next
  const undefinedDest = await resolveRoleDestination(undefined, async () => 'admin');
  assert.equal(undefinedDest, '/admin/users', 'Undefined next must resolve to admin target');

  // Failure in role fetching falls back to '/'
  const failDest = await resolveRoleDestination('/', async () => {
    throw new Error('Network error');
  });
  assert.equal(failDest, '/', 'Failed role fetch must safely fall back to /');

  // Missing fetchRole callback falls back to '/'
  const noCallbackDest = await resolveRoleDestination('/');
  assert.equal(noCallbackDest, '/', 'Missing role callback falls back to /');
}

// 2. Demo accounts validation
function testDemoAccounts() {
  assert.equal(DEMO_ACCOUNTS.length, 3, 'Must define exactly 3 demo accounts (admin, recruiter, developer)');

  const admin = DEMO_ACCOUNTS.find((a) => a.role === 'admin');
  assert.ok(admin, 'Admin demo account must exist');
  assert.equal(admin.email, 'admin@devarena.test');
  assert.ok(admin.password.length >= 8, 'Admin password must be >= 8 chars');
  assert.equal(admin.target, '/admin/users');

  const recruiter = DEMO_ACCOUNTS.find((a) => a.role === 'recruiter');
  assert.ok(recruiter, 'Recruiter demo account must exist');
  assert.equal(recruiter.email, 'recruiter@devarena.test');
  assert.ok(recruiter.password.length >= 8, 'Recruiter password must be >= 8 chars');
  assert.equal(recruiter.target, '/recruiter');

  const developer = DEMO_ACCOUNTS.find((a) => a.role === 'developer');
  assert.ok(developer, 'Developer demo account must exist');
  assert.equal(developer.email, 'developer@devarena.test');
  assert.ok(developer.password.length >= 8, 'Developer password must be >= 8 chars');
  assert.equal(developer.target, '/profile');
}

// 3. Proxy route protection for /recruiter
function testProxyRouteProtection() {
  const proxyPath = resolve(__dirname, '../src/proxy.ts');
  const proxyContent = readFileSync(proxyPath, 'utf8');
  assert.ok(
    proxyContent.includes("'/recruiter'"),
    'proxy.ts must include /recruiter in protectedRoute',
  );
}

// 4. Header links test
function testHeaderLinks() {
  const headerPath = resolve(__dirname, '../src/components/AuthHeader.tsx');
  const headerContent = readFileSync(headerPath, 'utf8');
  assert.ok(
    headerContent.includes('/recruiter'),
    'AuthHeader.tsx must link to /recruiter for recruiters and admins',
  );
  assert.ok(
    headerContent.includes('Recruiter Portal'),
    'AuthHeader.tsx must display Recruiter Portal label',
  );
}

await testRoleDestinations();
testDemoAccounts();
testProxyRouteProtection();
testHeaderLinks();

console.log('PASS: 16 role-based sign-in and recruiter navigation assertions');
