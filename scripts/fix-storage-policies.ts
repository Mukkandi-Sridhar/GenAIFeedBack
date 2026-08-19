#!/usr/bin/env tsx
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PROJECT_REF = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

const sql = `
-- Drop existing policies if any
drop policy if exists "Public Submissions Upload" on storage.objects;
drop policy if exists "Public Submissions Select" on storage.objects;
drop policy if exists "Give anon access to submissions bucket" on storage.objects;

-- Create policy allowing anyone (anon + authenticated) to upload files to submissions bucket
create policy "Public Submissions Upload" on storage.objects
  for insert with check (bucket_id = 'submissions');

-- Create policy allowing anyone to view/read files from submissions bucket
create policy "Public Submissions Select" on storage.objects
  for select using (bucket_id = 'submissions');
`;

async function applyStoragePolicies() {
  console.log('Applying Storage RLS policies to storage.objects in Supabase...');

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
        console.log('✅ Successfully applied Storage RLS policies for "submissions" bucket!');
        return;
      }
      const text = await res.text();
      console.log(`Endpoint returned ${res.status}: ${text}`);
    } catch (e: any) {
      console.log(`Endpoint error: ${e.message}`);
    }
  }

  console.log('\n⚠️ Could not execute SQL via endpoint directly. Please copy & paste this SQL into Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new\n');
  console.log(sql);
}

applyStoragePolicies();
