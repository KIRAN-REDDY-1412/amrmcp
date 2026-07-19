const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env variables
let envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
let supabaseKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.from('students').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log('No students found');
    }
  }
}
checkSchema();
