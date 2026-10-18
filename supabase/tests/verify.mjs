// No npm dependencies. Requires Node 22+ and PostgreSQL client tools.
// Applies T2/T3 only: the baseline must already exist on the dedicated DEV database.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(join(root, '.env'))) process.loadEnvFile(join(root, '.env'));
const env = process.env;
const host = env.PGHOST ?? '';
const local = ['127.0.0.1', 'localhost'].includes(host);
const ref = env.DEV_PROJECT_REF;
if (!host || !env.PGUSER || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(env.PGDATABASE ?? '')) {
  throw new Error('Set PGHOST, PGUSER and a plain PGDATABASE name explicitly.');
}
if (env.NODE_ENV === 'production') throw new Error('Database assertions are DEV-only.');
if (local) {
  if (!env.PGDATABASE.startsWith('devarena_identity_test')) {
    throw new Error('Local verification requires a devarena_identity_test* database.');
  }
} else if (!ref || !/^[a-z]{20}$/.test(ref) || ref === 'vluyukgqwrxfmscswqor' ||
  !(host === `db.${ref}.supabase.co` ||
    (host.endsWith('.pooler.supabase.com') && env.PGUSER === `postgres.${ref}`)) ||
  !['require', 'verify-ca', 'verify-full'].includes(env.PGSSLMODE ?? '')) {
  throw new Error('Dedicated DEV_PROJECT_REF must match PGHOST/PGUSER with TLS. Shared project is forbidden.');
}

function run(tool, args, capture = false) {
  const executable = env.PG_BIN
    ? join(env.PG_BIN, tool + (process.platform === 'win32' ? '.exe' : ''))
    : tool;
  // Explicit connection arguments prevent a local libpq service from redirecting the target.
  const connection = ['--host', host, '--port', env.PGPORT ?? '5432',
    '--username', env.PGUSER, '--dbname', env.PGDATABASE];
  const result = spawnSync(executable, [...connection, ...args], {
    env: { ...env, PGCONNECT_TIMEOUT: '10' }, encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    maxBuffer: 8 * 1024 * 1024,
  });
  // Never echo command arguments, environment variables or connection strings.
  if (result.error || result.status !== 0) {
    if (capture && result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${tool} failed; verification stopped.`);
  }
  return result.stdout;
}
const psql = (file) => run('psql', ['-X', '-w', '-q', '-v', 'ON_ERROR_STOP=1', '-f', resolve(root, file)]);
const schema = () => run('pg_dump', ['--schema-only', '--no-owner', '--schema=public',
  '--schema=private', '--schema=auth', '--schema=storage'], true)
  .split(/\r?\n/).filter(line => !/^\\(?:un)?restrict /.test(line)).join('\n');
const migrations = ['migrations/20261018000001_identity_profiles.sql',
  'migrations/20261018000002_identity_deletion.sql',
  'migrations/20261018000003_identity_hardening.sql'];

psql('precheck.sql');
for (const file of migrations) psql(file);
psql('tests/identity.sql');
const before = schema();
const bucketQuery = "select row_to_json(b)::text from storage.buckets b where id = 'avatars'";
const bucket = () => run('psql', ['-X', '-w', '-At', '-v', 'ON_ERROR_STOP=1', '-c', bucketQuery], true);
const bucketBefore = bucket();
for (const file of migrations) psql(file);
if (schema() !== before || bucket() !== bucketBefore) {
  throw new Error('Migration replay changed schema, grants, policies or avatar bucket configuration.');
}
psql('tests/identity.sql');
console.log('PASS: identity SQL assertions and migration replay.');
console.log(local ? 'LOCAL SQL ONLY: GoTrue/PostgREST/Storage API verification is still required.'
  : 'DEV SQL passed; complete tests/storage-smoke.mjs for Storage API validation.');
