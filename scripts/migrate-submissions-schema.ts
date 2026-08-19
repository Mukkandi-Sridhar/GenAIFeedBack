#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PROJECT_REF = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

const sql = `
-- 1. Alter submissions table columns
alter table submissions add column if not exists answers jsonb default '{}'::jsonb;
alter table submissions add column if not exists avg_rating numeric default 0;
alter table submissions add column if not exists is_read boolean default false;
alter table submissions add column if not exists is_archived boolean default false;
alter table submissions alter column feedback_text drop not null;

-- 2. Create index for fast inbox queries
create index if not exists idx_submissions_inbox on submissions(is_read, is_archived);

-- 3. Update public delete RLS policies on submissions
drop policy if exists "public_delete_submission" on submissions;
create policy "public_delete_submission" on submissions for delete using (true);

-- 4. Re-grant executing permissions for security functions
grant execute on function delete_student_submission(uuid, text, text) to anon;
grant execute on function delete_student_submission(uuid, text, text) to authenticated;
`;

async function runMigration() {
  console.log('Altering submissions table columns directly on Supabase...');

  const endpoints = [
    `${SUPABASE_URL}/pg/v1/query`,
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'x-connection-encrypted': 'false',
        },
        body: JSON.stringify({ query: sql }),
      });

      if (res.ok) {
        console.log('✅ submissions table schema modified successfully on Supabase!');
        return;
      }
      const text = await res.text();
      console.log(`Endpoint returned ${res.status}: ${text}`);
    } catch (e: any) {
      console.log(`Endpoint error: ${e.message}`);
    }
  }

  console.log('\n⚠️ Migration SQL could not be executed directly via endpoints.');
  console.log('Please copy and paste this SQL inside your Supabase project SQL Editor:');
  console.log('https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new\n');
  console.log(sql);
}

runMigration();
