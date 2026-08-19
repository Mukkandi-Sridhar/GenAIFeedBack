#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function resetAndFixAdminCode() {
  console.log('Updating admin_access code hash using Postgres crypt()...');

  // We can call RPC or execute an update via SQL, or update the hash format
  // In pgcrypto, $2a$ format is required for crypt() comparison.
  // Replacing $2b$ with $2a$ or setting a known pgcrypto hash:
  // Let's test if replacing $2b$ with $2a$ works in pgcrypto, OR set hash via SQL function.

  // Let's replace $2b$ with $2a$:
  const hash2a = '$2a$10$vO7g0PahP5f6cRijvx3ppuVLtoCemW/.p4bR8aJPQtGwVl08gMlEi';

  const { error } = await supabase
    .from('admin_access')
    .update({ code_hash: hash2a, attempts: 0, locked_until: null })
    .eq('id', 1);

  if (error) {
    console.error('Update error:', error);
    return;
  }

  console.log('Updated hash prefix to $2a$ and reset attempts to 0.');

  const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_admin_code', { p_code: 'dfa19admin' });
  console.log('RPC Test result for "dfa19admin":', rpcRes, 'Error:', rpcErr);
}

resetAndFixAdminCode();
