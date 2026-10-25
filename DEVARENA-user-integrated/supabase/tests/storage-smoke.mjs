// Dedicated Supabase DEV project only. Creates two temporary Auth users and files.
// Uses the existing backend SDK installation; no new dependencies.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

for (const path of ['../.env', '../../backend/.env', '../../nextjs/.env.local']) {
  const url = new URL(path, import.meta.url);
  if (existsSync(url)) process.loadEnvFile(url);
}
const ref = process.env.DEV_PROJECT_REF;
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (process.env.NODE_ENV === 'production' || !ref || !/^[a-z]{20}$/.test(ref) ||
  ref === 'vluyukgqwrxfmscswqor' || url !== `https://${ref}.supabase.co` ||
  !serviceKey || !publicKey) {
  throw new Error('Configure the dedicated DEV project and ignored env files before running. Shared project is forbidden.');
}
const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const options = { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocket } };
const admin = createClient(url, serviceKey, options);
const users = [];
const files = [];
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1sAAAAASUVORK5CYII=', 'base64');

function ok(result, label) {
  assert.equal(result.error, null, label); // SDK error details never contain credentials.
  return result.data;
}

try {
  for (let index = 0; index < 2; index++) {
    const email = `${randomUUID()}@identity.devarena.test`;
    const password = `${randomBytes(24).toString('base64url')}Aa1!`;
    const { user } = ok(await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { username: `smoke_${randomBytes(5).toString('hex')}`, role: 'admin' },
    }), 'create temporary dev user');
    users.push({ id: user.id });
    const client = createClient(url, publicKey, options);
    ok(await client.auth.signInWithPassword({ email, password }), 'sign in temporary dev user');
    users[index].client = client;
    const path = `${user.id}/${randomUUID()}.png`;
    // Track attempts before upload so cleanup also covers transport failures.
    files.push(path);
    ok(await client.storage.from('avatars').upload(path, png, { contentType: 'image/png' }), 'own-folder PNG upload');
  }
  const [a, b] = users;
  const aFile = files[0];
  const bFile = files[1];
  const profile = ok(await admin.from('profiles').select('role,status').eq('id', a.id).single(), 'read created profile');
  assert.deepEqual(profile, { role: 'developer', status: 'active' }, 'metadata role is ignored');
  assert.ok((await a.client.from('profiles').select('email,status').eq('id', a.id)).error, 'PII column read denied');
  assert.ok((await a.client.from('profiles').update({ role: 'admin' }).eq('id', a.id)).error, 'role write denied');

  const crossPath = `${b.id}/${randomUUID()}.png`;
  files.push(crossPath);
  assert.ok((await a.client.storage.from('avatars').upload(crossPath, png, { contentType: 'image/png' })).error,
    'cross-user upload denied');
  assert.ok((await a.client.storage.from('avatars').update(bFile, png, { contentType: 'image/png' })).error,
    'cross-user overwrite denied');
  await a.client.storage.from('avatars').remove([bFile]);
  const listing = ok(await b.client.storage.from('avatars').list(b.id), 'list owner folder after attempted cross-user delete');
  assert.ok(listing.some(file => `${b.id}/${file.name}` === bFile), 'cross-user delete preserved owner file');

  for (const [body, mime, pattern] of [
    [Buffer.alloc(3 * 1024 * 1024), 'image/png', /size|large|exceed|maximum/i],
    [Buffer.from('GIF89a'), 'image/gif', /mime|type|support|allow/i],
  ]) {
    const path = `${a.id}/${randomUUID()}.upload`;
    files.push(path);
    const result = await a.client.storage.from('avatars').upload(path, body, { contentType: mime });
    assert.ok(result.error, `${mime} invalid upload rejected`);
    assert.match(result.error.message, pattern, 'rejected for the intended upload restriction');
  }
  assert.ok((await admin.auth.admin.deleteUser(a.id)).error, 'deletion with remaining avatars is blocked');
  ok(await admin.storage.from('avatars').remove([aFile]), 'remove avatar through Storage API');
  ok(await admin.auth.admin.deleteUser(a.id), 'delete account after Storage cleanup');
  a.deleted = true;
  assert.equal(ok(await admin.from('profiles').select('id').eq('id', a.id), 'check profile cascade').length, 0);
  console.log('PASS: dev Auth/PostgREST/Storage API smoke checks.');
} finally {
  // Delete physical files first. A cleanup error aborts before deleting Auth users.
  if (files.length) ok(await admin.storage.from('avatars').remove(files), 'cleanup smoke files');
  for (const user of users) {
    if (!user.deleted) {
      ok(await admin.auth.admin.deleteUser(user.id), 'cleanup smoke account');
    }
  }
}
