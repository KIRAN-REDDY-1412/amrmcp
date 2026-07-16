/**
 * createAdminServiceRole.cjs
 *
 * Uses the Supabase Admin Auth API (service_role key) to:
 *   1. Create the user in auth.users directly (no email confirmation, no rate limit)
 *   2. Insert the matching profile row in public.users (bypasses RLS)
 *
 * Usage:
 *   node createAdminServiceRole.cjs <SERVICE_ROLE_KEY>
 *
 * Get your service role key from:
 *   Supabase Dashboard -> Settings -> API -> service_role (secret)
 */

const https = require('https');

const SERVICE_ROLE_KEY = process.argv[2];
const EMAIL = process.argv[3] || 'admin@amreddy.edu';
const PASSWORD = process.argv[4] || 'Admin@123';
const FULL_NAME = process.argv[5] || 'Dr. A.M. Reddy';

if (!SERVICE_ROLE_KEY) {
  console.error('');
  console.error('ERROR: Service Role Key is required.');
  console.error('');
  console.error('Usage:');
  console.error('  node createAdminServiceRole.cjs <SERVICE_ROLE_KEY> [EMAIL] [PASSWORD] [FULL_NAME]');
  console.error('');
  console.error('Where to find your Service Role Key:');
  console.error('  1. Go to https://supabase.com/dashboard');
  console.error('  2. Select your project: ofylxvnmvoyapirlnvog');
  console.error('  3. Click Settings (gear icon) -> API');
  console.error('  4. Copy the "service_role" key (under Project API keys)');
  console.error('');
  process.exit(1);
}

const SUPABASE_URL = 'https://ofylxvnmvoyapirlnvog.supabase.co';
const ROLE = 'admin';

function request(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = body ? JSON.stringify(body) : null;

    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + (parsed.search || ''),
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': token,
        'Authorization': `Bearer ${token}`,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('');
  console.log(`Supabase Project : ${SUPABASE_URL}`);
  console.log(`Creating Admin   : ${EMAIL}`);
  console.log('');

  // ── Step 1: Create user via Admin Auth API ─────────────────────────────────
  console.log('Step 1/3 — Creating user in Supabase Auth (admin API)...');
  const authRes = await request(
    'POST',
    `${SUPABASE_URL}/auth/v1/admin/users`,
    {
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,          // Mark email as already confirmed
      user_metadata: {
        role: ROLE,
        full_name: FULL_NAME,
      },
    },
    SERVICE_ROLE_KEY
  );

  if (authRes.status !== 200 && authRes.status !== 201) {
    const msg = authRes.body?.msg || authRes.body?.message || JSON.stringify(authRes.body);

    if (msg && msg.toLowerCase().includes('already registered')) {
      console.log('  Auth user already exists — fetching existing user ID...');
    } else {
      console.error(`  [ERROR] Auth API returned ${authRes.status}: ${msg}`);
      process.exit(1);
    }
  }

  let userId = authRes.body?.id;

  // If user already exists, fetch their ID from the list
  if (!userId) {
    console.log('Step 1b/3 — Fetching existing user from Auth...');
    const listRes = await request(
      'GET',
      `${SUPABASE_URL}/auth/v1/admin/users`,
      null,
      SERVICE_ROLE_KEY
    );
    const users = listRes.body?.users || [];
    const existing = users.find(u => u.email === EMAIL);
    if (!existing) {
      console.error('  [ERROR] Could not find existing user in Auth.');
      process.exit(1);
    }
    userId = existing.id;
    console.log(`  Found existing auth user. ID: ${userId}`);
  } else {
    console.log(`  Auth user created. ID: ${userId}`);
  }

  // ── Step 2: Check if profile row already exists ────────────────────────────
  console.log('Step 2/3 — Checking public.users for existing profile...');
  const checkRes = await request(
    'GET',
    `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=id`,
    null,
    SERVICE_ROLE_KEY
  );

  const existingRows = Array.isArray(checkRes.body) ? checkRes.body : [];
  if (existingRows.length > 0) {
    console.log('  Profile row already exists (trigger created it). Nothing to insert.');
  } else {
    // ── Step 3: Insert profile row ─────────────────────────────────────────────
    console.log('Step 3/3 — Inserting admin profile into public.users...');
    const insertRes = await request(
      'POST',
      `${SUPABASE_URL}/rest/v1/users`,
      { id: userId, email: EMAIL, role: ROLE, full_name: FULL_NAME, is_active: true },
      SERVICE_ROLE_KEY
    );

    if (insertRes.status !== 200 && insertRes.status !== 201) {
      const msg = insertRes.body?.message || insertRes.body?.msg || JSON.stringify(insertRes.body);
      console.error(`  [ERROR] DB insert returned ${insertRes.status}: ${msg}`);
      process.exit(1);
    }
    console.log('  Profile row inserted successfully.');
  }

  console.log('');
  console.log('=========================================');
  console.log('  SUCCESS! Admin user is ready to use.');
  console.log(`  Email    : ${EMAIL}`);
  console.log(`  Password : ${PASSWORD}`);
  console.log(`  Role     : ${ROLE}`);
  console.log('=========================================');
  console.log('');
}

main().catch(err => {
  console.error('Unhandled error:', err.message || err);
  process.exit(1);
});
