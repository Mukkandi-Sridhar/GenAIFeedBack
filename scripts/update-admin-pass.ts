#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const NEW_PASS = 'CSEAIML987';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function updateAdminPassword() {
  console.log(`Generating $2a$ bcrypt hash for code "${NEW_PASS}"...`);
  const salt = await bcrypt.genSalt(10);
  let hash = await bcrypt.hash(NEW_PASS, salt);
  hash = hash.replace(/^\$2b\$/, '$2a$'); // pgcrypto expects $2a$

  console.log('Hash generated:', hash);

  const { error } = await supabase
    .from('admin_access')
    .upsert({ id: 1, code_hash: hash, attempts: 0, locked_until: null });

  if (error) {
    console.error('❌ Error updating admin_access:', error.message);
    process.exit(1);
  }

  console.log('✅ admin_access updated in Supabase with password hash!');

  // Test verify_admin_code RPC
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_admin_code', { p_code: NEW_PASS });
  console.log('RPC Test result for "CSEAIML987":', rpcRes, 'Error:', rpcErr);

  if (rpcRes?.ok) {
    console.log('\n🎉 Admin password successfully updated to "CSEAIML987"!');
  } else {
    console.error('⚠️ Verification check failed!');
  }
}

updateAdminPassword();
