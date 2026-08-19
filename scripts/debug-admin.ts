#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkAdminCode() {
  console.log('Testing RPC verify_admin_code...');
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_admin_code', { p_code: 'dfa19admin' });
  console.log('RPC result:', rpcRes, 'Error:', rpcErr);

  console.log('\nChecking admin_access table...');
  const { data: row, error: rowErr } = await supabase.from('admin_access').select('*');
  console.log('Table content:', row, 'Error:', rowErr);
}

checkAdminCode();
