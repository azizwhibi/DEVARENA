/* eslint-disable @typescript-eslint/no-require-imports -- Node-only verifier loads optional local CJS test tools. */
// Real IndexedDB semantics through fake-indexeddb, isolated from browser data.
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const {
  indexedDB,
  IDBObjectStore,
} = require('../../.local/verification/node_modules/fake-indexeddb');
const values = new Map();
const context = vm.createContext({
  indexedDB,
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  },
  Date,
  Error,
});
vm.runInContext(fs.readFileSync('public/offline-store.js', 'utf8'), context);
const store = context.DevArenaOffline;
const a = '00000000-0000-4000-8000-000000000001',
  b = '00000000-0000-4000-8000-000000000002';
const input = {
  id: 'resource',
  title: 'Storage fixture',
  content: '<script>not executed</script>',
  status: 'published',
  updated_at: 'v1',
  skills: [{ id: 'skill', name: 'SQL', private: 'secret' }],
  access_token: 'must-not-persist',
  wallet: { balance: 999 },
  hints: ['secret'],
};
(async () => {
  await store.activate(a);
  await store.save(a, input);
  let rows = await store.list();
  assert.equal(rows.length, 1);
  for (const forbidden of ['access_token', 'wallet', 'hints'])
    assert.equal(rows[0][forbidden], undefined);
  assert.equal(rows[0].skills[0].private, undefined);
  assert.equal(rows[0].content, input.content);
  await assert.rejects(store.save(a, { ...input, status: 'draft' }));
  await assert.rejects(store.save(a, { ...input, content: '' }));
  await assert.rejects(
    store.save(a, { ...input, content: 'x'.repeat(100001) }),
  );
  await store.revalidate(input.id, 'v2');
  assert.equal((await store.list())[0].availability, 'stale');
  await store.revalidate(input.id, '', true);
  assert.equal((await store.list())[0].content, '');
  await store.save(a, input);
  await store.remove(input.id);
  assert.equal((await store.list()).length, 0);
  await store.save(a, input);
  await store.activate(b);
  assert.equal((await store.list()).length, 0);
  await assert.rejects(store.save(a, input));
  await store.save(b, input);
  await store.clear();
  assert.equal(store.owner(), null);
  assert.equal((await store.list()).length, 0);
  await store.activate(a);
  assert.equal((await store.list()).length, 0);
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function () {
    throw new DOMException('Full', 'QuotaExceededError');
  };
  await assert.rejects(
    store.save(a, input),
    (error) => error.name === 'QuotaExceededError',
  );
  IDBObjectStore.prototype.put = put;
  assert.equal(
    (await store.list()).length,
    0,
    'Failed downloads leave no partial copy',
  );
  const get = context.localStorage.getItem;
  context.localStorage.getItem = () => {
    throw new DOMException('Denied', 'SecurityError');
  };
  await assert.rejects(store.save(a, input));
  context.localStorage.getItem = get;
  const changes = await Promise.allSettled([
    store.activate(a),
    store.activate(b),
  ]);
  assert.equal(changes[1].status, 'fulfilled');
  assert.equal(store.owner(), b);
  assert.equal(
    (await store.list()).length,
    0,
    'Concurrent account changes cannot restore the earlier account',
  );
  await store.save(b, input);
  const set = context.localStorage.setItem;
  context.localStorage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
  await assert.rejects(store.activate(a));
  assert.equal(store.owner(), null, 'A failed account switch must hide the previous account');
  await assert.doesNotReject(store.clear(), 'Logout does not need free localStorage space');
  context.localStorage.setItem = set;
  console.log(
    'PASS: offline allowlist, atomic storage, deletion, stale/unavailable copies and account isolation',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
