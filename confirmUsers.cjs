const https = require('https');

const SUPABASE_URL = 'https://ofylxvnmvoyapirlnvog.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2];

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'ofylxvnmvoyapirlnvog.supabase.co',
      path: path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Fetching users...');
  const res = await request('GET', '/auth/v1/admin/users');
  const users = res.body.users || [];
  
  let confirmedCount = 0;
  for (const user of users) {
    if (!user.email_confirmed_at) {
      console.log(`Confirming email for: ${user.email}`);
      await request('PUT', `/auth/v1/admin/users/${user.id}`, { email_confirm: true });
      confirmedCount++;
    }
  }
  console.log(`Confirmed ${confirmedCount} unconfirmed users.`);
}

main().catch(console.error);
