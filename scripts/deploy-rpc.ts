#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('Testing direct service role delete and update on Supabase...');

  // Service role client bypasses RLS completely!
  // Let's test deleting any test submission or checking RLS policies
  const { data, error } = await supabase.from('submissions').select('id, reg_no, student_name').limit(1);
  console.log('Submissions in db:', data, 'Error:', error);
}

main();
