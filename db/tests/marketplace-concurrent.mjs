// Local disposable database only. Each scenario uses two real psql sessions.
// 1. Same item: A holds the wallet lock across pg_sleep; B then sees already_owned.
// 2. Two different items, balance pays for only one.
// 3. Two first purchases by a player who has no wallet row.
import { spawn } from 'node:child_process';

const host = process.env.PGHOST ?? '';
const database = process.env.PGDATABASE ?? '';
const user = process.env.PGUSER ?? 'postgres';
const port = process.env.PGPORT ?? '5432';
const container = process.env.PG_DOCKER_CONTAINER ?? '';
const adminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const buyerId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
const bareId = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3';

if (!['127.0.0.1', 'localhost'].includes(host)) {
  throw new Error('Refusing non-local PGHOST. This script does not connect to Supabase.');
}
if (!database.startsWith('devarena_identity_test')) {
  throw new Error('Refusing a database outside devarena_identity_test*.');
}

function psqlArgs() {
  if (container) {
    return {
      command: 'docker',
      args: ['exec', '-i', container, 'psql', '-U', user, '-d', database,
        '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-At'],
    };
  }
  const executable = process.env.PG_BIN
    ? `${process.env.PG_BIN}\\psql.exe`
    : 'psql';
  return {
    command: executable,
    args: ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-At',
      '--host', host, '--port', port, '--username', user, '--dbname', database],
  };
}

function psql(sql, { allowFailure = false } = {}) {
  const { command, args } = psqlArgs();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.stderr.on('data', (chunk) => { err += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      const result = { code, out: out.trim(), err: err.trim() };
      if (code !== 0 && !allowFailure) {
        reject(new Error(result.err || result.out || `${command} exited ${code}`));
      } else {
        resolve(result);
      }
    });
    child.stdin.end(sql);
  });
}

function assert(ok, message) {
  if (!ok) throw new Error(`ASSERTION FAILED: ${message}`);
  console.log(`PASS: ${message}`);
}

function lineStarting(output, prefix) {
  return output.split(/\r?\n/).find((row) => row.startsWith(prefix)) ?? '';
}

async function walletLockVisible() {
  for (let i = 0; i < 40; i += 1) {
    const count = await psql(`
      select count(*)
      from pg_locks as lock
      join pg_class as class on class.oid = lock.relation
      join pg_namespace as namespace on namespace.oid = class.relnamespace
      where namespace.nspname = 'public'
        and class.relname = 'credit_wallets'
        and lock.granted
        and lock.mode = 'RowExclusiveLock';
    `);
    if (Number(count.out) > 0) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

const userIds = `'${adminId}', '${buyerId}', '${bareId}'`;
const cleanup = `
delete from public.audit_log
where actor_id in (${userIds}) or target_id in (${userIds});
delete from auth.users where id in (${userIds});
delete from public.marketplace_items
where title in ('Concurrent', 'Left', 'Right', 'Bare');
`;

async function ensureUsers() {
  await psql(cleanup);
  await psql(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${adminId}', 'concurrent-admin@marketplace.test', '{}'),
      ('${buyerId}', 'concurrent-buyer@marketplace.test', '{}'),
      ('${bareId}', 'concurrent-bare@marketplace.test', '{}');
    update public.profiles set role = 'admin' where id = '${adminId}';
  `);
}

try {
  const dbName = await psql('select current_database();');
  assert(dbName.out === database, `connected to ${dbName.out}`);
  await ensureUsers();

  const granted = await psql(
    `select public.admin_grant_credits('${adminId}', '${buyerId}', 100, 'concurrent seed');`,
  );
  assert(granted.out === '100', 'seed grant returns 100');
  const sameItem = await psql(`
    select public.marketplace_admin_save_item(
      '${adminId}', null, 'icon', 'Concurrent', 'Deux connexions',
      40, 'published', '>_', null, null, null);
  `);
  assert(/^[0-9a-f-]{36}$/i.test(sameItem.out), `item created ${sameItem.out}`);

  const started = Date.now();
  const holder = psql(`
    begin;
    select 'A|' || credits_balance || '|' || already_owned
    from public.purchase_marketplace_item('${buyerId}', '${sameItem.out}');
    select pg_sleep(4);
    commit;
  `).catch((error) => {
    throw error;
  });
  assert(await walletLockVisible(), 'session A holds credit_wallets RowExclusiveLock before session B starts');
  const waiterStarted = Date.now();
  const waiter = await psql(`
    begin;
    select 'B|' || credits_balance || '|' || already_owned
    from public.purchase_marketplace_item('${buyerId}', '${sameItem.out}');
    commit;
  `);
  const waiterMs = Date.now() - waiterStarted;
  const holderResult = await holder;
  const holderLine = lineStarting(holderResult.out, 'A|');
  const waiterLine = lineStarting(waiter.out, 'B|');
  console.log(`session A: ${holderLine}`);
  console.log(`session B: ${waiterLine} after ${waiterMs} ms (overlap since A start: ${Date.now() - started} ms)`);
  assert(holderLine === 'A|60|false', 'session A debits once to 60');
  assert(waiterLine === 'B|60|true', 'session B waits, then sees the committed purchase');
  assert(waiterMs >= 1000, `session B blocked on the wallet lock (${waiterMs} ms)`);
  const balance = await psql(
    `select balance from public.credit_wallets where user_id = '${buyerId}';`,
  );
  const purchases = await psql(`
    select count(*) from public.marketplace_purchases
    where user_id = '${buyerId}' and item_id = '${sameItem.out}' and price_paid = 40;
  `);
  const ledger = await psql(`
    select count(*) from public.credit_transactions
    where user_id = '${buyerId}' and item_id = '${sameItem.out}'
      and kind = 'marketplace_purchase' and amount = -40;
  `);
  assert(balance.out === '60', 'committed balance stays 60');
  assert(purchases.out === '1', 'one purchase row');
  assert(ledger.out === '1', 'one negative ledger row');

  await ensureUsers();
  await psql(
    `select public.admin_grant_credits('${adminId}', '${buyerId}', 50, 'pays for one');`,
  );
  const left = await psql(`
    select public.marketplace_admin_save_item(
      '${adminId}', null, 'icon', 'Left', 'Premier article',
      40, 'published', 'L', null, null, null);
  `);
  const right = await psql(`
    select public.marketplace_admin_save_item(
      '${adminId}', null, 'icon', 'Right', 'Second article',
      40, 'published', 'R', null, null, null);
  `);
  const leftHold = psql(`
    begin;
    select 'L|' || credits_balance || '|' || already_owned
    from public.purchase_marketplace_item('${buyerId}', '${left.out}');
    select pg_sleep(4);
    commit;
  `);
  assert(await walletLockVisible(), 'first of two different purchases holds the wallet lock');
  const rightAttempt = await psql(`
    begin;
    select 'R|' || credits_balance || '|' || already_owned
    from public.purchase_marketplace_item('${buyerId}', '${right.out}');
    commit;
  `, { allowFailure: true });
  const leftResult = await leftHold;
  const leftLine = lineStarting(leftResult.out, 'L|');
  console.log(`different items: ${leftLine}; other session code ${rightAttempt.code}`);
  assert(leftLine === 'L|10|false', 'the only affordable purchase debits 50 to 10');
  assert(rightAttempt.code !== 0 && /insufficient_credits/.test(rightAttempt.err),
    'the second different item is refused for insufficient credits');
  assert(!/23505|duplicate key/i.test(rightAttempt.err),
    'the refused purchase does not surface a unique violation');
  const splitBalance = await psql(
    `select balance from public.credit_wallets where user_id = '${buyerId}';`,
  );
  const leftCount = await psql(`
    select count(*) from public.marketplace_purchases
    where user_id = '${buyerId}' and item_id = '${left.out}';
  `);
  const rightCount = await psql(`
    select count(*) from public.marketplace_purchases
    where user_id = '${buyerId}' and item_id = '${right.out}';
  `);
  assert(splitBalance.out === '10' && leftCount.out === '1' && rightCount.out === '0',
    'final balance is 10 with exactly one of the two items owned');

  await ensureUsers();
  const bareItem = await psql(`
    select public.marketplace_admin_save_item(
      '${adminId}', null, 'icon', 'Bare', 'Sans portefeuille',
      40, 'published', 'B', null, null, null);
  `);
  const bareBefore = await psql(
    `select count(*) from public.credit_wallets where user_id = '${bareId}';`,
  );
  assert(bareBefore.out === '0', 'the bare player has no wallet row');
  const purchaseSql = `
    select credits_balance, already_owned
    from public.purchase_marketplace_item('${bareId}', '${bareItem.out}');
  `;
  const [first, second] = await Promise.all([
    psql(purchaseSql, { allowFailure: true }),
    psql(purchaseSql, { allowFailure: true }),
  ]);
  for (const attempt of [first, second]) {
    assert(attempt.code !== 0 && /insufficient_credits/.test(attempt.err),
      'a first purchase without a wallet raises insufficient_credits');
    assert(!/23505|duplicate key/i.test(attempt.err),
      'creating the missing wallet does not raise a unique violation');
  }
  const bareWallet = await psql(
    `select count(*) from public.credit_wallets where user_id = '${bareId}';`,
  );
  const barePurchases = await psql(`
    select count(*) from public.marketplace_purchases where user_id = '${bareId}';
  `);
  assert(bareWallet.out === '0' && barePurchases.out === '0',
    'both refusals roll back, leaving no wallet and no purchase');
  console.log('PASS: concurrent purchase assertions');
} finally {
  await psql(cleanup).catch((error) => {
    console.error(error.message);
  });
}
