import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');

function loadEnv() {
  if (!existsSync(envPath)) {
    throw new Error(`Environment file not found at ${envPath}`);
  }
  const content = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in backend/.env');
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const DEMO_USERS = [
  {
    email: 'admin@devarena.test',
    password: 'DevArenaAdmin2026!',
    username: 'admin_demo',
    role: 'admin',
    visibility: 'public',
  },
  {
    email: 'recruiter@devarena.test',
    password: 'DevArenaRecruiter2026!',
    username: 'recruiter_demo',
    role: 'recruiter',
    visibility: 'public',
  },
  {
    email: 'developer@devarena.test',
    password: 'DevArenaDev2026!',
    username: 'developer_demo',
    role: 'developer',
    visibility: 'public',
  },
];

export async function seedRoles() {
  console.log(`[SeedRoles] Connecting to Supabase project at ${supabaseUrl}...`);
  for (const item of DEMO_USERS) {
    console.log(`[SeedRoles] Processing ${item.role}: ${item.email}...`);
    // Check if user already exists
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error(`[SeedRoles] Failed to list users: ${listError.message}`);
      throw listError;
    }
    const existing = usersData.users.find(
      (u) => u.email?.toLowerCase() === item.email.toLowerCase(),
    );

    let userId = existing?.id;
    if (!existing) {
      const { data: created, error: createError } =
        await supabase.auth.admin.createUser({
          email: item.email,
          password: item.password,
          email_confirm: true,
          user_metadata: {
            username: item.username,
            visibility: item.visibility,
          },
        });
      if (createError) {
        console.error(`[SeedRoles] Failed to create user ${item.email}: ${createError.message}`);
        throw createError;
      }
      userId = created.user.id;
      console.log(`[SeedRoles] Created user ${item.email} (id: ${userId})`);
    } else {
      // Ensure password and email confirmed
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          password: item.password,
          email_confirm: true,
        },
      );
      if (updateError) {
        console.warn(`[SeedRoles] Note: could not update password for ${item.email}: ${updateError.message}`);
      } else {
        console.log(`[SeedRoles] Existing user ${item.email} verified and updated.`);
      }
    }

    // Now ensure profile has the designated role and active status
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: item.role,
        status: 'active',
      })
      .eq('id', userId);

    if (profileError) {
      console.error(`[SeedRoles] Failed to update profile role for ${userId}: ${profileError.message}`);
      throw profileError;
    }

    console.log(`[SeedRoles] Verified profile role='${item.role}' for ${item.email}`);
  }
  console.log('[SeedRoles] All demo role accounts successfully provisioned!');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedRoles().catch((err) => {
    console.error('[SeedRoles] Error:', err);
    process.exit(1);
  });
}
