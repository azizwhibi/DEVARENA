// Local disposable PostgREST only. Refuses any host that is not loopback.
// Seeds through the published Postgres port (trust auth). Does not call Supabase.
//
// Postgres on 127.0.0.1:55433, database devarena_identity_test, migrations applied.
// PostgREST on the Docker bridge, because a port published only on 127.0.0.1
// is not reachable as host.docker.internal from another container:
//   docker run -d --name devarena-postgrest-test --network bridge -p 127.0.0.1:3002:3000 \
//     -e PGRST_DB_URI=postgres://postgres@<identity-container-ip>:5432/devarena_identity_test \
//     -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
//     -e PGRST_JWT_SECRET=local-postgrest-test-only-not-a-real-secret \
//     -e PGRST_SERVER_PORT=3000 postgrest/postgrest:v12.2.3
//
//   PGHOST=127.0.0.1 PGPORT=55433 PGDATABASE=devarena_identity_test \
//   POSTGREST_URL=http://127.0.0.1:3002 node supabase/tests/marketplace-postgrest.mjs
import { createHmac } from 'node:crypto';
import { connect } from 'node:net';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createClient } = require('../../backend/node_modules/@supabase/supabase-js');

const host = process.env.PGHOST ?? '127.0.0.1';
const database = process.env.PGDATABASE ?? 'devarena_identity_test';
const user = process.env.PGUSER ?? 'postgres';
const port = Number(process.env.PGPORT ?? '55433');
const postgrestUrl = process.env.POSTGREST_URL ?? 'http://127.0.0.1:3002';
const jwtSecret = 'local-postgrest-test-only-not-a-real-secret';
const adminId = '11111111-1111-4111-8111-111111111111';
const buyerId = '22222222-2222-4222-8222-222222222222';
const challengeId = '33333333-3333-4333-8333-333333333333';

const postgrest = new URL(postgrestUrl);
if (!['127.0.0.1', 'localhost'].includes(host) || !['127.0.0.1', 'localhost'].includes(postgrest.hostname)) {
  throw new Error('Refusing a non-local database or PostgREST URL.');
}
if (!database.startsWith('devarena_identity_test')) {
  throw new Error('Refusing a database outside devarena_identity_test*.');
}

function pgQuery(sql) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port });
    let buf = Buffer.alloc(0);
    let started = false;
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('local postgres timed out'));
    }, 10000);
    const fail = (error) => {
      clearTimeout(timer);
      socket.destroy();
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    socket.on('error', fail);
    socket.on('connect', () => {
      const params = Buffer.from(`user\0${user}\0database\0${database}\0\0`);
      const startup = Buffer.alloc(8 + params.length);
      startup.writeInt32BE(startup.length, 0);
      startup.writeInt32BE(196608, 4);
      params.copy(startup, 8);
      socket.write(startup);
    });
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 5) {
        const type = String.fromCharCode(buf[0]);
        const length = buf.readInt32BE(1);
        if (buf.length < 1 + length) return;
        const payload = buf.subarray(5, 1 + length);
        buf = buf.subarray(1 + length);
        if (type === 'E') {
          fail(new Error(payload.toString('utf8').replaceAll('\0', ' ')));
          return;
        }
        if (type === 'R' && payload.readInt32BE(0) !== 0) {
          fail(new Error('local postgres did not accept trust authentication'));
          return;
        }
        if (type === 'Z' && !started) {
          started = true;
          const query = Buffer.from(`${sql}\0`);
          const packet = Buffer.alloc(5 + query.length);
          packet.write('Q', 0);
          packet.writeInt32BE(query.length + 4, 1);
          query.copy(packet, 5);
          socket.write(packet);
        } else if (type === 'Z') {
          clearTimeout(timer);
          socket.end();
          resolve();
        }
      }
    });
  });
}

function assert(ok, message) {
  if (!ok) throw new Error(`ASSERTION FAILED: ${message}`);
  console.log(`PASS: ${message}`);
}

function token(role = 'service_role') {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ role, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const signature = createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

const marketplaceRpcs = [
  ['purchase_marketplace_item', { p_user_id: buyerId, p_item_id: challengeId }],
  ['equip_marketplace_item', { p_user_id: buyerId, p_item_id: challengeId }],
  ['unequip_marketplace_item', { p_user_id: buyerId, p_slot: 'icon' }],
  ['marketplace_hint_content', { p_user_id: buyerId, p_item_id: challengeId }],
  ['marketplace_admin_purchased_ids', { p_admin_id: adminId, p_item_ids: [challengeId] }],
  ['admin_grant_credits', { p_admin_id: adminId, p_user_id: buyerId, p_amount: 1, p_reason: 'denied' }],
  ['marketplace_admin_save_item', {
    p_admin_id: adminId, p_item_id: null, p_kind: 'icon', p_title: 'denied', p_description: '',
    p_price_credits: 1, p_status: 'draft', p_preview: '', p_animation_key: null, p_challenge_id: null, p_hint_body: null,
  }],
  ['marketplace_admin_archive_item', { p_admin_id: adminId, p_item_id: challengeId }],
];

const marketplaceTables = [
  'marketplace_items',
  'marketplace_secrets',
  'marketplace_purchases',
  'user_equipped_items',
  'credit_transactions',
  'credit_wallets',
];

async function asRole(role, path, body) {
  const headers = { accept: 'application/json' };
  if (role) {
    const bearer = token(role);
    headers.authorization = `Bearer ${bearer}`;
    headers.apikey = bearer;
  }
  if (body) headers['content-type'] = 'application/json';
  const response = await fetch(`${postgrestUrl}${path}`, {
    method: body ? 'POST' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, text: await response.text() };
}

function assertRefused(result, label) {
  const denied = result.status === 401 || result.status === 403
    || /permission denied|42501/i.test(result.text);
  const rows = result.text.trim().startsWith('[');
  assert(denied && !rows, `${label} is refused without rows, got ${result.status} ${result.text.slice(0, 180)}`);
}

async function assertClosedTo(role) {
  const label = role ?? 'anonymous';
  for (const [fn, args] of marketplaceRpcs) {
    assertRefused(await asRole(role, `/rpc/${fn}`, args), `${label} ${fn}`);
  }
  for (const table of marketplaceTables) {
    const result = await asRole(role, `/${table}?select=*`);
    assertRefused(result, `${label} select ${table}`);
    if (table === 'marketplace_secrets' || table === 'credit_wallets') {
      assert(!result.text.includes('"balance"') && !result.text.includes('"body"'), `${label} select ${table} returns no row column`);
    }
  }
}

async function raw(fn, args) {
  const response = await fetch(`${postgrestUrl}/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token()}`,
      apikey: token(),
    },
    body: JSON.stringify(args),
  });
  const text = await response.text();
  return { status: response.status, text };
}

async function main() {
  try {
    await run();
  } finally {
    await pgQuery(`
      delete from auth.users where id in ('${adminId}', '${buyerId}');
      delete from public.marketplace_items where title like 'postgrest-shape-%';
      delete from public.challenges where id = '${challengeId}';
    `).catch((error) => console.error(error));
  }
}

async function run() {
  await assertClosedTo('authenticated');
  await assertClosedTo(null);
  const bearer = token();
  const client = createClient(postgrestUrl, bearer, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const url = String(input instanceof Request ? input.url : input).replace('/rest/v1/', '/');
        return fetch(url, init);
      },
    },
  });

  await pgQuery(`
    delete from auth.users where id in ('${adminId}', '${buyerId}');
    delete from public.marketplace_items where title like 'postgrest-shape-%';
    delete from public.challenges where id = '${challengeId}';
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${adminId}', 'postgrest-admin@example.test', '{"username":"pgrest_admin"}'),
      ('${buyerId}', 'postgrest-buyer@example.test', '{"username":"pgrest_buyer"}');
    update public.profiles set role = 'admin' where id = '${adminId}';
    insert into public.challenges (id, title, difficulty)
    values ('${challengeId}', 'PostgREST shape', 'beginner');
    insert into public.credit_wallets (user_id, balance) values ('${buyerId}', 100);
  `);

  const icon = await client.rpc('marketplace_admin_save_item', {
    p_admin_id: adminId,
    p_item_id: null,
    p_kind: 'icon',
    p_title: 'postgrest-shape-icon',
    p_description: 'icon',
    p_price_credits: 40,
    p_status: 'published',
    p_preview: '>_',
    p_animation_key: null,
    p_challenge_id: null,
    p_hint_body: null,
  });
  assert(!icon.error && typeof icon.data === 'string', `save returns a uuid string, got ${JSON.stringify(icon.data)} ${icon.error?.message ?? ''} ${icon.status ?? ''}`);
  const iconId = icon.data;

  const hint = await client.rpc('marketplace_admin_save_item', {
    p_admin_id: adminId,
    p_item_id: null,
    p_kind: 'hint',
    p_title: 'postgrest-shape-hint',
    p_description: 'hint',
    p_price_credits: 30,
    p_status: 'published',
    p_preview: '?',
    p_animation_key: null,
    p_challenge_id: challengeId,
    p_hint_body: 'secret phrase',
  });
  assert(!hint.error && typeof hint.data === 'string', `hint save returns a uuid string, got ${hint.error?.message ?? typeof hint.data}`);
  const hintId = hint.data;

  const purchase = await client.rpc('purchase_marketplace_item', { p_user_id: buyerId, p_item_id: iconId });
  assert(
    Array.isArray(purchase.data) && purchase.data.length === 1
      && purchase.data[0].already_owned === false
      && typeof purchase.data[0].credits_balance === 'number'
      && purchase.data[0].hint_content === null,
    `purchase is a one-row array, got ${JSON.stringify(purchase.data)} ${purchase.error?.message ?? ''}`,
  );
  const purchaseRaw = await raw('purchase_marketplace_item', { p_user_id: buyerId, p_item_id: iconId });
  assert(
    purchaseRaw.status === 200 && purchaseRaw.text.startsWith('[{') && purchaseRaw.text.includes('"already_owned":true'),
    `repeat purchase body, raw ${purchaseRaw.status} ${purchaseRaw.text}`,
  );

  const equipped = await client.rpc('equip_marketplace_item', { p_user_id: buyerId, p_item_id: iconId });
  const equippedRaw = await raw('equip_marketplace_item', { p_user_id: buyerId, p_item_id: iconId });
  assert(equipped.error == null && equipped.data === null, `equip supabase-js data is null, got ${JSON.stringify(equipped.data)} raw ${equippedRaw.status} ${equippedRaw.text}`);

  const boughtHint = await client.rpc('purchase_marketplace_item', { p_user_id: buyerId, p_item_id: hintId });
  assert(
    Array.isArray(boughtHint.data) && boughtHint.data.length === 1 && boughtHint.data[0].hint_content === 'secret phrase',
    `hint purchase returns hint_content, got ${JSON.stringify(boughtHint.data)} ${boughtHint.error?.message ?? ''}`,
  );

  const hintRead = await client.rpc('marketplace_hint_content', { p_user_id: buyerId, p_item_id: hintId });
  const hintRaw = await raw('marketplace_hint_content', { p_user_id: buyerId, p_item_id: hintId });
  assert(hintRead.data === 'secret phrase', `hint content is a string, raw ${hintRaw.status} ${hintRaw.text}`);

  const grant = await client.rpc('admin_grant_credits', {
    p_admin_id: adminId,
    p_user_id: buyerId,
    p_amount: 5,
    p_reason: 'postgrest shape',
  });
  const grantRaw = await raw('admin_grant_credits', {
    p_admin_id: adminId,
    p_user_id: buyerId,
    p_amount: 1,
    p_reason: 'postgrest shape again',
  });
  assert(typeof grant.data === 'number', `grant is a number, raw ${grantRaw.status} ${grantRaw.text}`);

  const ids = await client.rpc('marketplace_admin_purchased_ids', {
    p_admin_id: adminId,
    p_item_ids: [iconId, hintId],
  });
  const idsRaw = await raw('marketplace_admin_purchased_ids', {
    p_admin_id: adminId,
    p_item_ids: [iconId, hintId],
  });
  assert(
    Array.isArray(ids.data) && ids.data.every((id) => typeof id === 'string') && ids.data.includes(iconId) && ids.data.includes(hintId),
    `purchased_ids is a uuid array, raw ${idsRaw.status} ${idsRaw.text}`,
  );

  const removed = await client.rpc('unequip_marketplace_item', { p_user_id: buyerId, p_slot: 'icon' });
  assert(removed.error == null && removed.data === null, `unequip supabase-js data is null, got ${JSON.stringify(removed.data)}`);
  console.log('postgrest shapes passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
