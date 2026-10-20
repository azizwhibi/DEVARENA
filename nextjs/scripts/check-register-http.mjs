import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = process.env.TEST_FRONTEND_URL ?? 'http://localhost:3101';
const response = await fetch(base + '/register');
assert.equal(response.status, 200);
assert.match(response.headers.get('cache-control'), /no-store/);
const html = await response.text();
const checks = [
  ['Page title', /<title>Create an account \| DevArena<\/title>/],
  ['Email label', /<label[^>]*for="email"/],
  ['Email constraints', /<input[^>]*id="email"[^>]*type="email"[^>]*required=""/],
  ['Username label', /<label[^>]*for="username"/],
  ['Username length and charset', /<input[^>]*id="username"[^>]*minLength="3"[^>]*maxLength="24"[^>]*pattern="\[A-Za-z0-9_\]\{3,24\}"/],
  ['Username help association', /aria-describedby="username-hint"/],
  ['Password label', /<label[^>]*for="password"/],
  ['Password rules and autocomplete', /<input[^>]*id="password"[^>]*type="password"[^>]*autoComplete="new-password"[^>]*required=""[^>]*minLength="8"/],
  ['Password help association', /aria-describedby="password-hint"/],
  ['Public visibility by default', /<input[^>]*id="visibility"[^>]*type="checkbox"[^>]*checked=""/],
  ['Visibility label', /Show me on public leaderboards/],
  ['Visibility help association', /aria-describedby="visibility-hint"/],
  ['Form fieldset name', /<legend[^>]*>Account details<\/legend>/],
  ['Submit button', /<button[^>]*type="submit"[^>]*>Create account<\/button>/],
  ['Login link', /href="\/login"/],
];
for (const [label, pattern] of checks) assert.match(html, pattern, label);
assert.match(html, /name="role"[^>]*value="developer"/, 'Developer role radio option');
assert.match(html, /name="role"[^>]*value="recruiter"/, 'Recruiter role radio option');
assert.doesNotMatch(html, /name="status"/, 'Status must not be user-selectable');
assert.doesNotMatch(html, /name="role"[^>]*value="admin"/, 'Admin role must not be user-selectable');
const template = await readFile(new URL('../../supabase/templates/confirmation.html', import.meta.url), 'utf8');
const rendered = template.replaceAll('{{ .RedirectTo }}', base + '/auth/callback').replaceAll('{{ .TokenHash }}', 'synthetic-test-hash');
const href = rendered.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&');
const link = new URL(href);
assert.equal(link.origin, base);
assert.equal(link.pathname, '/auth/callback');
assert.equal(link.searchParams.get('token_hash'), 'synthetic-test-hash');
assert.equal(link.searchParams.get('type'), 'email');
assert.ok(!template.includes('.ConfirmationURL'));
console.log(`PASS: ${checks.length + 8} registration HTTP/template assertions`);
