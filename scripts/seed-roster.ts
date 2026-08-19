#!/usr/bin/env tsx
/**
 * DFA19 — Seed all 69 students directly into Supabase.
 * No CSV needed — data is hardcoded from the class roster.
 *
 * Usage:  npx tsx scripts/seed-roster.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing env vars. Make sure .env is configured.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Student Roster ───────────────────────────────────────────────────
// CSE (AI & ML) IV Year I Sem — 69 students
const STUDENTS: Record<string, string> = {
  "23091A3301": "MEKALA AMMAR",
  "23091A3302": "MEERIJA ANJUM",
  "23091A3304": "T.BHANU PRAKASH",
  "23091A3305": "ANDHE BHARGAV",
  "23091A3306": "SOMPALLI BRAHMINI",
  "23091A3307": "CHITIKELA CHARAN",
  "23091A3308": "P CHARAN KUMAR REDDY",
  "23091A3309": "KAKI CHARITHA RANI",
  "23091A3310": "KALLETI DEDEEPYA VARSHINI",
  "23091A3311": "BETHAMSETTY DEEPTHI",
  "23091A3312": "KUMARNAIK GARI DHARSHAN",
  "23091A3313": "BOVILLA DILEEP KUMAR REDDY",
  "23091A3314": "GANDLA ERANNA",
  "23091A3315": "M GIRI PRASAD",
  "23091A3316": "KETHEPALLE GURU SAI SULEKHA",
  "23091A3317": "PATHURU GURU VISHNU",
  "23091A3318": "VELDURTHI HEMA",
  "23091A3319": "CHAKALI HIMA BINDHU",
  "23091A3320": "CHALLA HIMA VAMSI REDDY",
  "23091A3321": "SHAIK MOHAMMAD HUSSAIN",
  "23091A3322": "GURUMADHU KAKARLA",
  "23091A3323": "ANDRA KEERTHANA",
  "23091A3324": "KURIMIGALLA KRISHNA MOHAN",
  "23091A3325": "KAMPAMALLA MADHAVI",
  "23091A3326": "BESTHA MAHESH BABU",
  "23091A3327": "MOGILIPALLI MANI RUPESH",
  "23091A3328": "GOPANNAGARI MANJUNATH",
  "23091A3329": "GADDAM MANVITHA",
  "23091A3330": "MURIKI NAGA VENKATA SAI",
  "23091A3331": "AGRAHARAM NAVEEN KUMAR",
  "23091A3332": "KYABARSHI NAVYA",
  "23091A3333": "PRANATHI REDDY K",
  "23091A3334": "CHITTIBOINA RAJESWARI",
  "23091A3336": "BOGGADI RAMA DEVI",
  "23091A3337": "BILAVATH RAMESH NAIK",
  "23091A3338": "MOPURU RUSHENDRA PHANI",
  "23091A3339": "PYARAM RUSHIKA",
  "23091A3340": "CHENNURI SAI",
  "23091A3341": "BARRENKALA SAI KIRANMAYI",
  "23091A3342": "TOMALA SAI MANASWINI",
  "23091A3343": "GADDAM SAI SWAROOPA REDDY",
  "23091A3344": "A MOHAMMED SAMEER",
  "23091A3345": "VAKAMALLA SANJANA",
  "23091A3346": "SYED SHAIJIDA BHANU",
  "23091A3348": "DUDEKULA SIDDINI SHARMI",
  "23091A3349": "MUKKANDI SRIDHAR",
  "23091A3350": "IDHUMALLA SUDHEER KUMAR",
  "23091A3351": "MADDULA SUMANTH",
  "23091A3352": "TAGARAM SUMMITHA",
  "23091A3353": "VANKE SUNEETHA",
  "23091A3354": "SIVAPURAM SWAPNA",
  "23091A3355": "LAKKIREDDY SWAROOPA",
  "23091A3356": "SHAIK TARANNUM NAAZ",
  "23091A3357": "GAJULAPALLE THANUJA",
  "23091A3358": "MOTA THRILOK",
  "23091A3359": "PALLA UMESH",
  "23091A3360": "KOTHA VARUN KUMAR",
  "23091A3361": "N VENKATA NAGA JOSHITA",
  "23091A3362": "T VENKATA NAGA TEJASWINI",
  "23091A3363": "GORLA VIJAYA LAKSHMI",
  "23091A3364": "MANERI VISHNU SAI VAMSI",
  "23091A3365": "DAYYAM YASHWANTH",
  "24095A3301": "PHATAN AFROZ ALI KHAN",
  "24095A3302": "CHINTHALA CHENNA MADHAVI",
  "24095A3303": "JAMBULA DINESH REDDY",
  "24095A3304": "LABBI NAGARJUNA",
  "24095A3305": "PATHAPADU SAIMANJUNATH",
  "24095A3306": "GANTALA SUMANTH",
  "24095A3307": "SUDDULA VENKATA SIVUDU",
};

const rows = Object.entries(STUDENTS).map(([reg_no, name]) => ({
  reg_no,
  name,
  status: 'pending' as const,
  submitted_at: null,
}));

console.log(`\n📋  Seeding ${rows.length} students into Supabase…`);
console.log(`    ${SUPABASE_URL}\n`);

// Upsert in a single call (service role bypasses RLS)
const CHUNK = 25;
let inserted = 0;

for (let i = 0; i < rows.length; i += CHUNK) {
  const chunk = rows.slice(i, i + CHUNK);
  const { error } = await supabase
    .from('students')
    .upsert(chunk, { onConflict: 'reg_no', ignoreDuplicates: false });

  if (error) {
    console.error(`❌  Error at chunk ${Math.floor(i / CHUNK) + 1}:`, error.message);
    console.error('    Make sure the schema SQL has been run in the Supabase SQL editor first.');
    process.exit(1);
  }

  inserted += chunk.length;
  console.log(`    ✅  ${inserted} / ${rows.length} students seeded`);
}

// Verify
const { data: check, error: checkErr } = await supabase
  .from('students')
  .select('reg_no, name, status')
  .order('reg_no');

if (checkErr) {
  console.error('\n⚠️   Could not verify:', checkErr.message);
} else {
  console.log(`\n✅  Verified: ${check?.length} rows in students table`);
  console.log('\n  Sample:');
  check?.slice(0, 5).forEach((s) => {
    console.log(`    ${s.reg_no}  →  ${s.name}  [${s.status}]`);
  });
  if ((check?.length ?? 0) > 5) console.log(`    … and ${(check?.length ?? 0) - 5} more`);
}

console.log('\n🎉  Roster seeded! Run the app:\n    npm run dev\n');
