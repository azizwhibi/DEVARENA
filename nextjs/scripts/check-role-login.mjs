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

// 3. Proxy route protection for /recruiter, /invitations, /messages
function testProxyRouteProtection() {
  const proxyPath = resolve(__dirname, '../src/proxy.ts');
  const proxyContent = readFileSync(proxyPath, 'utf8');
  assert.ok(
    proxyContent.includes("'/recruiter'"),
    'proxy.ts must include /recruiter in protectedRoute',
  );
  assert.ok(
    proxyContent.includes("'/invitations'"),
    'proxy.ts must include /invitations in protectedRoute',
  );
  assert.ok(
    proxyContent.includes("'/messages'"),
    'proxy.ts must include /messages in protectedRoute',
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
    headerContent.includes('Candidate hub'),
    'AuthHeader.tsx must display Candidate hub label',
  );
}

// 5. Register form recruiter option test
function testRegisterFormRecruiterRole() {
  const registerPath = resolve(__dirname, '../src/components/auth/RegisterForm.tsx');
  const registerContent = readFileSync(registerPath, 'utf8');
  assert.ok(
    registerContent.includes('value="recruiter"'),
    'RegisterForm.tsx must contain recruiter role radio option',
  );
  assert.ok(
    registerContent.includes('value="developer"'),
    'RegisterForm.tsx must contain developer role radio option',
  );
  assert.ok(
    !registerContent.includes('value="admin"'),
    'RegisterForm.tsx must never contain admin role option',
  );
}

// 6. Proxy preserves safe next parameter on authenticated login redirect
function testProxyNextRedirection() {
  const proxyPath = resolve(__dirname, '../src/proxy.ts');
  const proxyContent = readFileSync(proxyPath, 'utf8');
  assert.ok(
    proxyContent.includes('safeNext(') && proxyContent.includes('nextUrl.searchParams.get'),
    'proxy.ts must respect and sanitize next parameter on authenticated redirects',
  );
}

// 7. LoginForm wires persona targets and avoids race conditions
function testLoginFormPersonaHandling() {
  const loginPath = resolve(__dirname, '../src/components/auth/LoginForm.tsx');
  const loginContent = readFileSync(loginPath, 'utf8');
  assert.ok(
    loginContent.includes('demo.target') || loginContent.includes('handleDemoLogin(demo)'),
    'LoginForm.tsx must wire demo target for instant role routing',
  );
  assert.ok(
    loginContent.includes('window.location.assign'),
    'LoginForm.tsx must navigate via window.location.assign to avoid router.refresh race conditions',
  );
}

// 8. Navigation isolation in SkillsWorkspace
function testWorkspaceNavigationIsolation() {
  const wsPath = resolve(__dirname, '../src/components/skills/SkillsWorkspace.tsx');
  const wsContent = readFileSync(wsPath, 'utf8');
  assert.ok(
    wsContent.includes("account?.role === 'admin'") &&
    wsContent.includes("[{ title: 'Administration', links: administration }]"),
    'SkillsWorkspace must show strictly administration links for admin',
  );
  assert.ok(
    wsContent.includes("account?.role === 'recruiter'") &&
    wsContent.includes("recruiterNavigation"),
    'SkillsWorkspace must show strictly recruiter links for recruiter',
  );
  assert.ok(
    wsContent.includes("href: '/recruiter'") &&
    wsContent.includes("href: '/invitations'") &&
    wsContent.includes("href: '/messages'"),
    'recruiterNavigation must include Candidate Hub, Invitations, and Messages',
  );
}

// 9. Profile & Settings role boundaries
function testProfileRoleBoundaries() {
  const headerPath = resolve(__dirname, '../src/components/profile/ProfileHeader.tsx');
  const headerContent = readFileSync(headerPath, 'utf8');
  assert.ok(
    headerContent.includes('isDeveloper && <ProfileProgress'),
    'ProfileHeader must render ProfileProgress only for developers',
  );
  assert.ok(
    headerContent.includes('isDeveloper && profile.technologies.length > 0'),
    'ProfileHeader must render technologies chips only for developers',
  );
  assert.ok(
    headerContent.includes('Recruiter Talent Hub'),
    'ProfileHeader must render Recruiter Talent Hub for recruiters',
  );
  assert.ok(
    headerContent.includes('Administration & Moderation'),
    'ProfileHeader must render Administration & Moderation for admins',
  );

  const formPath = resolve(__dirname, '../src/components/profile/ProfileForm.tsx');
  const formContent = readFileSync(formPath, 'utf8');
  assert.ok(
    formContent.includes('{isDeveloper && (') &&
    formContent.includes('Skills & Technologies'),
    'ProfileForm must show Skills & Technologies only for developers',
  );
}

// 10. Developer challenges access protection
function testChallengesAccessProtection() {
  const arenaPath = resolve(__dirname, '../src/app/(skills)/arena/page-client.tsx');
  const arenaContent = readFileSync(arenaPath, 'utf8');
  assert.ok(
    arenaContent.includes("router.replace('/recruiter')") &&
    arenaContent.includes("router.replace('/admin/users')"),
    'Arena page must redirect non-developers to their role workspace',
  );

  const dashboardPath = resolve(__dirname, '../src/app/(skills)/dashboard/page-client.tsx');
  const dashboardContent = readFileSync(dashboardPath, 'utf8');
  assert.ok(
    dashboardContent.includes("router.replace('/admin/users')") &&
    dashboardContent.includes("router.replace('/recruiter')"),
    'Dashboard page must redirect non-developers to their role workspace',
  );
}

// 11. AccountProvider resilience and backend connectivity diagnosis
function testAccountProviderResilience() {
  const providerPath = resolve(__dirname, '../src/components/AccountProvider.tsx');
  const providerContent = readFileSync(providerPath, 'utf8');
  assert.ok(
    providerContent.includes('Unable to connect to backend API server'),
    'AccountProvider must provide actionable diagnosis when backend is unreachable',
  );
  assert.ok(
    providerContent.includes('isRetry') && providerContent.includes('setTimeout'),
    'AccountProvider must include automatic transient retry for network errors',
  );

  const loginPath = resolve(__dirname, '../src/components/auth/LoginForm.tsx');
  const loginContent = readFileSync(loginPath, 'utf8');
  assert.ok(
    loginContent.includes('metaRole'),
    'LoginForm must leverage user_metadata.role for instant redirect resolution',
  );

  const mainPath = resolve(__dirname, '../../backend/src/main.ts');
  const mainContent = readFileSync(mainPath, 'utf8');
  assert.ok(
    mainContent.includes('127.0.0.1:3001') && mainContent.includes('localhost:3001'),
    'Backend main.ts must permit both localhost and 127.0.0.1 origins',
  );
}

await testRoleDestinations();
testDemoAccounts();
testProxyRouteProtection();
testHeaderLinks();
testRegisterFormRecruiterRole();
testProxyNextRedirection();
testLoginFormPersonaHandling();
testWorkspaceNavigationIsolation();
testProfileRoleBoundaries();
testChallengesAccessProtection();
testAccountProviderResilience();

console.log('PASS: 36 role-based sign-in, navigation, and role-workflow boundary assertions');
