import { createClient } from '@supabase/supabase-js';
import type { EventModule } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing env vars — VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Storage bucket name
export const STORAGE_BUCKET = 'submissions';

// Default fallback event module
export const DEFAULT_EVENT: EventModule = {
  id: 'dfa19-default-id',
  slug: 'deepfake-detection-analysis',
  title: 'Deepfake Detection and Analysis',
  subject: 'Generative AI',
  department: 'CSE (AI & ML)',
  semester: 'IV Year I Semester',
  event_date: '19 August 2026',
  is_active: true,
  created_at: new Date().toISOString(),
};
