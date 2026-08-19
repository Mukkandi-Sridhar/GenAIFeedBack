#!/usr/bin/env tsx
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sql = `
-- Drop and recreate RLS policies for delete and update
drop policy if exists "public_delete_submission" on submissions;
create policy "public_delete_submission" on submissions for delete using (true);

drop policy if exists "public_update_student_status" on students;
create policy "public_update_student_status" on students for update using (true) with check (true);

-- Create RPC delete_student_submission
create or replace function delete_student_submission(p_sub_id uuid, p_reg_no text, p_event_id text default null)
returns json
language plpgsql
security definer
as $$
begin
  delete from submissions where id = p_sub_id;

  if p_event_id is not null and p_event_id != '' then
    update students set status = 'pending', submitted_at = null
    where reg_no = p_reg_no and event_id = p_event_id;
  else
    update students set status = 'pending', submitted_at = null
    where reg_no = p_reg_no;
  end if;

  return json_build_object('ok', true);
end;
$$;

grant execute on function delete_student_submission(uuid, text, text) to anon;
grant execute on function delete_student_submission(uuid, text, text) to authenticated;
`;

async function main() {
  console.log('Attempting to execute SQL via Supabase REST endpoints...');

  const headersList = [
    { 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'apikey': SERVICE_ROLE_KEY, 'Content-Type': 'application/json' },
    { 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
  ];

  const urls = [
    `${SUPABASE_URL}/rest/v1/rpc/exec`,
    `${SUPABASE_URL}/pg/v1/query`,
    `${SUPABASE_URL}/rest/v1/query`,
  ];

  for (const url of urls) {
    for (const headers of headersList) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: sql }),
        });
        console.log(`URL ${url} returned status ${res.status}`);
        if (res.ok) {
          console.log('🎉 SUCCESS! Executed SQL on Supabase!');
          return;
        }
      } catch (e: any) {
        console.log(`URL ${url} error:`, e.message);
      }
    }
  }

  console.log('\nDirect API execution requires Supabase Dashboard SQL Editor.');
}

main();
