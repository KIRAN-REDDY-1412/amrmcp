const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env file manually
const envPath = path.join(__dirname, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[match[1]] = value.trim();
    }
  });
}

const supabaseUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase credentials not found in .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdmin() {
  const email = 'admin@amrcp.edu.in';
  const password = 'Admin@123';
  const name = 'admin';

  console.log(`Connecting to Supabase at: ${supabaseUrl}`);
  console.log(`Registering Admin User: ${email}...`);

  // 1. Sign up the user in Supabase Auth with metadata
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'admin',
        full_name: name,
      }
    }
  });

  if (authError) {
    console.error('\n[ERROR] Failed to create user in Supabase Auth:', authError.message);
    if (authError.message.toLowerCase().includes('invalid') || authError.message.toLowerCase().includes('bad request')) {
      console.log('\n=========================================');
      console.log('TIP: Supabase is rejecting the mock domain "amrcp.edu.in" because it does not have active DNS/MX records.');
      console.log('To bypass this for local development:');
      console.log('1. Go to your Supabase dashboard (https://supabase.com).');
      console.log('2. Go to Authentication -> Providers -> Email.');
      console.log('3. Turn OFF "Confirm email" (Double Opt-In).');
      console.log('4. Save changes and run this script again.');
      console.log('=========================================\n');
    }
    process.exit(1);
  }

  if (!authData.user) {
    console.error('Failed to create user: No user object returned.');
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`Auth User created successfully! ID: ${userId}`);

  // 2. Insert into public.users (or check if trigger did it)
  console.log('Verifying or inserting admin profile record in users table...');
  
  // Wait a moment for trigger to run
  await new Promise(r => setTimeout(r, 1000));

  const { data: existingUser, error: queryError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existingUser) {
    console.log('SUCCESS: Database trigger automatically created and linked your public.users profile!');
    console.log('Initial Admin user is completely set up and ready to use.');
    process.exit(0);
  }

  if (queryError) {
    console.log('Note: Could not fetch from users table (might be due to RLS). Proceeding with manual insert...');
  }

  // Fallback to manual insert if trigger didn't run or wasn't deployed
  const { error: dbError } = await supabase.from('users').insert([{
    id: userId,
    email,
    role: 'admin',
    full_name: name,
    is_active: true,
  }]);

  if (dbError) {
    console.error('\n[ERROR] Failed to insert profile row in public.users:', dbError.message);
    console.log('\n=========================================');
    console.log('TIP: To fix this RLS policy error:');
    console.log('1. Go to your Supabase dashboard SQL Editor.');
    console.log('2. Copy the contents of "supabase/migrations/20260715000000_init.sql".');
    console.log('3. Paste the contents and click RUN to create the tables and trigger.');
    console.log('4. This script (or the trigger) will then run successfully.');
    console.log('=========================================\n');
    process.exit(1);
  }

  console.log('Initial Admin user successfully created and linked via manual profile insert!');
}

createAdmin().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
