import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL.replace(/\/rest\/v1\/?$/, '');
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  const email = 'administration@amreddy.edu';
  const password = 'admin@12345';

  console.log(`Attempting to create admin account for: ${email}`);

  // 1. Sign up the user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    console.error("Failed to create auth user:", authError.message);
    if (authError.message.includes('already registered')) {
        console.log("User might already exist in auth.users. Trying to just insert into public.users.");
    } else {
        process.exit(1);
    }
  }

  const userId = authData?.user?.id;
  
  if (!userId) {
      console.log("Could not get user ID. If user already exists, please delete them from Supabase Auth UI first, or log in to get ID.");
      return;
  }

  console.log(`Successfully created auth user with ID: ${userId}`);

  // 2. Insert into the public.users table
  const { error: dbError } = await supabase.from('users').upsert([
    {
      id: userId,
      email: email,
      role: 'admin',
      full_name: 'System Administrator',
      is_active: true
    }
  ]);

  if (dbError) {
    console.error("Failed to insert into users table:", dbError.message);
    process.exit(1);
  }

  console.log("Successfully created Admin account! You can now log in.");
}

createAdmin();
