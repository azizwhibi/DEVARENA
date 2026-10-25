import assert from 'node:assert/strict';
import { safeNext } from '../src/lib/safe-next.ts';

for (const raw of [undefined, null, '', 'https://evil.com', '//evil.com', '/\\evil.com', '/\n/evil.com', 'javascript:alert(1)']) {
  assert.equal(safeNext(raw), '/', `Reject unsafe destination ${JSON.stringify(raw)}`);
}
for (const raw of ['/', '/profile?x=1', '/admin/users?page=2']) {
  assert.equal(safeNext(raw), raw);
}
console.log('PASS: 11 safe-next assertions');
