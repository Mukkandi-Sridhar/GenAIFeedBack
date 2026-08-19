#!/usr/bin/env tsx
/**
 * DFA19 Portal — Full Automated Supabase Setup
 *
 * What this script does:
 *  1. Runs the full database schema SQL (tables, RLS, RPC, Realtime)
 *  2. Creates the "submissions" Storage bucket (public)
 *  3. Seeds the admin_access table with a bcrypt hash of the chosen code
 *
 * Usage:
 *   npx tsx scripts/setup-supabase.ts
 *
 * Admin code default: dfa19admin  (change ADMIN_CODE below)
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

config(); // Load .env

// ─── Config ────────────────────────────────────────────────────────
const SUPABASE_URL      = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_CODE        = 'CSEAIML987';
const PROJECT_REF       = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helpers ────────────────────────────────────────────────────────
function ok(msg: string)    { console.log(`  ✅  ${msg}`); }
function info(msg: string)  { console.log(`  ℹ️   ${msg}`); }
function warn(msg: string)  { console.log(`  ⚠️   ${msg}`); }
function err(msg: string)   { console.log(`  ❌  ${msg}`); }

async function runSQL(query: string, label: string): Promise<boolean> {
  // Try Supabase pg-meta API (used internally by Supabase Studio)
  const endpoints = [
    `${SUPABASE_URL}/pg/v1/query`,
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey':         SERVICE_ROLE_KEY,
          'Content-Type':  'application/json',
          'x-connection-encrypted': 'false',
        },
        body: JSON.stringify({ query }),
      });

      if (res.ok) {
        ok(label);
        return true;
      }

      const body = await res.text().catch(() => '');
      // If 404, try next endpoint; otherwise report
      if (res.status !== 404 && res.status !== 401) {
        warn(`SQL endpoint returned ${res.status} for "${label}": ${body.slice(0, 120)}`);
      }
    } catch (_) {
      // network error — try next endpoint
    }
  }

  warn(`SQL via API not available for: ${label}`);
  return false;
}

// ─── SQL statements split into discrete steps ───────────────────────
const schemaSteps: Array<{ label: string; sql: string }> = [
  {
    label: 'Enable pgcrypto extension',
    sql: `create extension if not exists pgcrypto;`,
  },
  {
    label: 'Create students table',
    sql: `
      create table if not exists students (
        reg_no       text primary key,
        name         text not null,
        status       text not null default 'pending'
                     check (status in ('pending','submitted')),
        submitted_at timestamptz
      );`,
  },
  {
    label: 'Create submissions table',
    sql: `
      create table if not exists submissions (
        id            uuid primary key default gen_random_uuid(),
        reg_no        text references students(reg_no) not null,
        student_name  text not null,
        feedback_text text not null,
        file_urls     text[] default '{}',
        source        text not null default 'student'
                      check (source in ('student','admin_added')),
        created_at    timestamptz default now()
      );`,
  },
  {
    label: 'Create admin_access table',
    sql: `
      create table if not exists admin_access (
        id           int primary key default 1,
        code_hash    text not null,
        attempts     int default 0,
        locked_until timestamptz
      );`,
  },
  {
    label: 'Create indexes',
    sql: `
      create index if not exists idx_submissions_reg_no     on submissions(reg_no);
      create index if not exists idx_submissions_created_at on submissions(created_at desc);
      create index if not exists idx_students_status        on students(status);`,
  },
  {
    label: 'Enable Row Level Security',
    sql: `
      alter table students     enable row level security;
      alter table submissions  enable row level security;
      alter table admin_access enable row level security;`,
  },
  {
    label: 'Drop old policies (safe)',
    sql: `
      drop policy if exists "public_read_students"       on students;
      drop policy if exists "public_insert_submission"   on submissions;
      drop policy if exists "public_read_own_submission" on submissions;`,
  },
  {
    label: 'Create RLS: public read students',
    sql: `
      create policy "public_read_students" on students
        for select using (true);`,
  },
  {
    label: 'Create RLS: public insert submissions (pending guard)',
    sql: `
      create policy "public_insert_submission" on submissions
        for insert with check (
          exists (
            select 1 from students s
            where s.reg_no = submissions.reg_no
              and s.status = 'pending'
          )
        );`,
  },
  {
    label: 'Create RLS: public read submissions',
    sql: `
      create policy "public_read_own_submission" on submissions
        for select using (true);`,
  },
  {
    label: 'Create RLS: public update students',
    sql: `
      create policy "public_update_student_status" on students
        for update using (true) with check (true);`,
  },
  {
    label: 'Enable Realtime on submissions + students',
    sql: `
      begin;
        alter publication supabase_realtime add table submissions;
        alter publication supabase_realtime add table students;
      commit;`,
  },
  {
    label: 'Create verify_admin_code RPC function',
    sql: `
      create or replace function verify_admin_code(p_code text)
      returns json
      language plpgsql
      security definer
      as $$
      declare
        v_row   admin_access%rowtype;
        v_ok    boolean;
        v_lock  timestamptz;
      begin
        select * into v_row from admin_access where id = 1;
        if not found then
          return json_build_object('ok', false, 'locked_until', null);
        end if;
        if v_row.locked_until is not null and v_row.locked_until > now() then
          return json_build_object('ok', false, 'locked_until', v_row.locked_until);
        end if;
        if v_row.locked_until is not null and v_row.locked_until <= now() then
          update admin_access set attempts = 0, locked_until = null where id = 1;
          select * into v_row from admin_access where id = 1;
        end if;
        v_ok := (crypt(p_code, v_row.code_hash) = v_row.code_hash);
        if v_ok then
          update admin_access set attempts = 0, locked_until = null where id = 1;
          return json_build_object('ok', true, 'locked_until', null);
        else
          update admin_access
          set
            attempts = v_row.attempts + 1,
            locked_until = case when v_row.attempts + 1 >= 5
                             then now() + interval '60 seconds'
                             else null end
          where id = 1
          returning locked_until into v_lock;
          return json_build_object('ok', false, 'locked_until', v_lock);
        end if;
      end;
      $$;`,
  },
  {
    label: 'Grant verify_admin_code to anon + authenticated',
    sql: `
      grant execute on function verify_admin_code(text) to anon;
      grant execute on function verify_admin_code(text) to authenticated;`,
  },
];

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  DFA19 Supabase Setup\n');
  console.log(`  Project : ${SUPABASE_URL}`);
  console.log(`  Admin code: "${ADMIN_CODE}" (change ADMIN_CODE in script to use different)\n`);

  // ── Step 1: Run schema SQL ──────────────────────────────────────
  console.log('📐  Running schema SQL…');
  let sqlWorked = false;
  for (const step of schemaSteps) {
    const ok = await runSQL(step.sql, step.label);
    if (ok) sqlWorked = true;
    // Add small delay between statements
    await new Promise(r => setTimeout(r, 100));
  }

  if (!sqlWorked) {
    console.log('\n⚠️   Direct SQL API not available — paste the schema manually:');
    console.log('  1. Open https://supabase.com/dashboard/project/lxmnboswlmcwxqmhekid/sql/new');
    console.log('  2. Paste the contents of: supabase/schema.sql');
    console.log('  3. Click Run');
    console.log('\n  Continuing with JS-API setup steps…\n');
  }

  // ── Step 2: Create storage bucket ──────────────────────────────
  console.log('\n🪣  Creating storage bucket…');
  try {
    const { error } = await supabase.storage.createBucket('submissions', {
      public: true,
      fileSizeLimit: 15 * 1024 * 1024, // 15MB
      allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    });

    if (error && error.message.includes('already exists')) {
      ok('Storage bucket "submissions" already exists — skipping');
    } else if (error) {
      warn(`Bucket creation: ${error.message}`);
    } else {
      ok('Storage bucket "submissions" created (public, 15MB limit)');
    }
  } catch (e: any) {
    warn(`Bucket: ${e.message}`);
  }

  // ── Step 3: Generate bcrypt hash + seed admin_access ───────────
  console.log('\n🔐  Generating admin code hash…');
  const salt = await bcrypt.genSalt(10);
  let hash = await bcrypt.hash(ADMIN_CODE, salt);
  hash = hash.replace(/^\$2b\$/, '$2a$'); // pgcrypto in Postgres expects $2a$
  info(`Code: "${ADMIN_CODE}" → hash generated`);

  try {
    // Try JS client upsert (works if table was created by SQL step)
    const { error } = await supabase
      .from('admin_access')
      .upsert({ id: 1, code_hash: hash, attempts: 0, locked_until: null });

    if (error) {
      warn(`admin_access upsert: ${error.message}`);
      console.log('\n  Run this SQL to set your admin code manually:');
      console.log(`  INSERT INTO admin_access (id, code_hash, attempts)`);
      console.log(`  VALUES (1, '${hash}', 0)`);
      console.log(`  ON CONFLICT (id) DO UPDATE SET code_hash = '${hash}', attempts = 0;`);
    } else {
      ok(`admin_access seeded with hash for "${ADMIN_CODE}"`);
    }
  } catch (e: any) {
    warn(`admin_access: ${e.message}`);
    console.log('\n  Run this SQL to set your admin code manually:');
    console.log(`  INSERT INTO admin_access (id, code_hash, attempts)`);
    console.log(`  VALUES (1, '${hash}', 0)`);
    console.log(`  ON CONFLICT (id) DO UPDATE SET code_hash = '${hash}', attempts = 0;`);
  }

  // ── Step 4: Verify connection ────────────────────────────────────
  console.log('\n🔗  Verifying Supabase connection…');
  try {
    const { data, error } = await supabase.from('students').select('count').limit(1);
    if (error) {
      warn(`Connection check: ${error.message}`);
    } else {
      ok('Supabase connection verified — students table accessible');
    }
  } catch (e: any) {
    warn(`Connection: ${e.message}`);
  }

  // ── Summary ──────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('🎉  Setup complete!\n');
  console.log('  Your admin login:');
  console.log(`    URL:  http://localhost:5173/portal-dfa19-review`);
  console.log(`    Code: ${ADMIN_CODE}`);
  console.log('\n  Next steps:');
  console.log('  1. If SQL steps failed, run supabase/schema.sql in the SQL editor:');
  console.log('     https://supabase.com/dashboard/project/lxmnboswlmcwxqmhekid/sql/new');
  console.log('  2. Seed students once you have students.csv:');
  console.log('     npx tsx scripts/seed-students.ts students.csv');
  console.log('  3. npm run dev — then open http://localhost:5173\n');
}

main().catch((e) => {
  console.error('❌  Fatal:', e);
  process.exit(1);
});
