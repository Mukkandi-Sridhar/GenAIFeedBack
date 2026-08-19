#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedDefaultEvent() {
  console.log('Seeding default Event Form Module into Supabase...');

  // 1. Insert default event module
  const { data: event, error: evErr } = await supabase
    .from('events')
    .upsert(
      {
        slug: 'deepfake-detection-analysis',
        title: 'Deepfake Detection and Analysis',
        subject: 'Generative AI',
        department: 'CSE (AI & ML)',
        semester: 'IV Year I Semester',
        event_date: '19 August 2026',
        is_active: true,
      },
      { onConflict: 'slug' }
    )
    .select()
    .single();

  if (evErr) {
    console.error('Error seeding event:', evErr.message);
    return;
  }

  console.log('✅ Event Module Created:', event.title, `[ID: ${event.id}]`);

  // 2. Update existing students to set event_id
  const { error: stErr } = await supabase
    .from('students')
    .update({ event_id: event.id })
    .is('event_id', null);

  if (stErr) {
    console.warn('Note on updating students event_id:', stErr.message);
  } else {
    console.log('✅ Linked existing students to event module ID');
  }

  // 3. Update existing submissions to set event_id
  const { error: subErr } = await supabase
    .from('submissions')
    .update({ event_id: event.id })
    .is('event_id', null);

  if (subErr) {
    console.warn('Note on updating submissions event_id:', subErr.message);
  } else {
    console.log('✅ Linked existing submissions to event module ID');
  }

  console.log('\n🎉 Multi-Module Seed Complete!');
}

seedDefaultEvent();
