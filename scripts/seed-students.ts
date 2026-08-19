#!/usr/bin/env tsx
/**
 * Seed script: bulk-import students from a CSV file into Supabase.
 *
 * CSV format (with header row):
 *   reg_no,name
 *   21CSE001,John Doe
 *   21CSE002,Jane Smith
 *   ...
 *
 * Usage:
 *   npx tsx scripts/seed-students.ts students.csv
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (NOT the anon key).
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load .env
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const csvFile = process.argv[2];
if (!csvFile) {
  console.error('Usage: npx tsx scripts/seed-students.ts <path-to-csv>');
  process.exit(1);
}

const filePath = resolve(process.cwd(), csvFile);
const raw = readFileSync(filePath, 'utf-8');
const lines = raw.split(/\r?\n/).filter(Boolean);

// Remove header
const [headerLine, ...dataLines] = lines;
const headers = headerLine.toLowerCase().split(',').map((h) => h.trim());
const regNoIdx = headers.indexOf('reg_no');
const nameIdx = headers.indexOf('name');

if (regNoIdx === -1 || nameIdx === -1) {
  console.error(`❌  CSV must have "reg_no" and "name" columns. Found: ${headerLine}`);
  process.exit(1);
}

const students = dataLines
  .map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    return {
      reg_no: cols[regNoIdx],
      name: cols[nameIdx],
      status: 'pending' as const,
      submitted_at: null,
    };
  })
  .filter((s) => s.reg_no && s.name);

if (students.length === 0) {
  console.error('❌  No valid rows found in CSV');
  process.exit(1);
}

console.log(`📋  Seeding ${students.length} students…`);

// Batch upsert in chunks of 20
const CHUNK = 20;
let inserted = 0;

for (let i = 0; i < students.length; i += CHUNK) {
  const chunk = students.slice(i, i + CHUNK);
  const { error } = await supabase
    .from('students')
    .upsert(chunk, { onConflict: 'reg_no', ignoreDuplicates: false });

  if (error) {
    console.error(`❌  Error seeding chunk ${i / CHUNK + 1}:`, error.message);
    process.exit(1);
  }
  inserted += chunk.length;
  console.log(`  ✓  ${inserted} / ${students.length}`);
}

console.log(`\n✅  Successfully seeded ${inserted} students into Supabase!`);
console.log('\nNext steps:');
console.log('  1. Set admin code hash in Supabase SQL editor:');
console.log("     SELECT crypt('yourcode', gen_salt('bf', 10));");
console.log('     UPDATE admin_access SET code_hash = \'<result>\' WHERE id = 1;');
console.log('  2. Enable Realtime on students + submissions tables');
console.log('  3. Create a "submissions" Storage bucket (public)');
