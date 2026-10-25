import assert from 'node:assert/strict';

const base = process.env.TEST_FRONTEND_URL ?? 'http://localhost:3101';
let assertions = 0;
for (const path of ['/profile?x=1', '/admin/users?page=2']) {
  const response = await fetch(base + path, { redirect: 'manual' });
  assert.equal(response.status, 307);
  const destination = new URL(response.headers.get('location'), base);
  assert.equal(destination.pathname, '/login');
  assert.equal(destination.searchParams.get('next'), path);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assertions += 4;
}
const login = await fetch(base + '/login?next=https://evil.com');
assert.equal(login.status, 200);
const html = await login.text();
for (const expected of ['type="email"', 'type="password"', 'for="email"', 'for="password"', '/register', '/forgot-password']) {
  assert.ok(html.includes(expected), `Login HTML contains ${expected}`);
}
const callback = await fetch(base + '/auth/callback?next=https://evil.com', { redirect: 'manual' });
assert.equal(callback.status, 307);
const destination = new URL(callback.headers.get('location'), base);
assert.equal(destination.pathname, '/login');
assert.equal(destination.searchParams.get('error'), 'callback_failed');
assert.equal((await fetch(base + '/favicon.ico')).status, 200);
console.log(`PASS: ${assertions + 11} local login HTTP assertions`);
