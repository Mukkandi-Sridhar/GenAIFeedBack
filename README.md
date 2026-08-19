# DFA19 — Conference Feedback & Document Intake Portal

> **Department:** CSE (AI & ML) · IV Year I Semester  
> **Subject:** Generative AI  
> **Event:** Conference on "Deepfake Detection and Analysis"  
> **Date:** 19 August 2026

A production-grade, fully responsive feedback portal built with **React 18 + Vite + TypeScript + TailwindCSS + Framer Motion + Supabase**.

---

## Quick Start

### 1. Clone & Install

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_SLUG=portal-dfa19-review

# For seed script only:
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Set Up Supabase

#### a) Run the schema

In **Supabase Dashboard → SQL Editor → New Query**, paste [`supabase/schema.sql`](./supabase/schema.sql) and run.

#### b) Create the Storage bucket

Dashboard → Storage → New Bucket — Name: `submissions`, Public: **enabled**

#### c) Set the admin access code

```sql
-- Generate hash
SELECT crypt('myAdminCode42', gen_salt('bf', 10));

-- Paste result:
UPDATE admin_access SET code_hash = '$2a$10$...' WHERE id = 1;
```

### 4. Seed the Student Roster

```csv
# students.csv
reg_no,name
21CSEB001,Student One
21CSEB002,Student Two
```

```bash
npx tsx scripts/seed-students.ts students.csv
```

### 5. Run

```bash
npm run dev
```

---

## Routes

| URL | Screen |
|---|---|
| `/` | Cover → Roster (in-page transition) |
| `/roster` | Roster grid |
| `/feedback/:regNo` | Student feedback form |
| `/<VITE_ADMIN_SLUG>` | Admin gate |
| `/<VITE_ADMIN_SLUG>/dashboard` | Admin dashboard |

---

## Features

- **Cover Screen** — Animated hero, glitch/mesh background, staggered entrance
- **Roster Grid** — 69 cards, 2–6 cols responsive, search, live status badges, realtime updates
- **Feedback Form** — Server-side duplicate guard, drag-drop file upload, sanitization
- **Admin Gate** — bcrypt code, 5-attempt lockout, 60s countdown
- **Admin Dashboard** — Live realtime updates, two-pane desktop / bottom-sheet mobile
- **Manual Add** — Admin submits on behalf of pending students
- **Individual PDF** — Per-student report with full feedback + attachments
- **Bulk PDF/Excel** — Letterhead, autotable, frozen header, autofilter

---

## Export Letterhead

```
CSE (AI & ML) | IV Year I Semester
Conference: Deepfake Detection and Analysis | Subject: Generative AI | Date: 19 August 2026
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Styling | TailwindCSS v4 |
| Animation | Framer Motion |
| Backend | Supabase (Postgres + Storage + Realtime) |
| Charts | recharts |
| PDF | jsPDF + jspdf-autotable |
| Excel | SheetJS |
| Icons | lucide-react |

---

## Deployment (Vercel)

```bash
npm run build
vercel --prod
```

Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_SLUG` in Vercel env settings.

---

## Security Notes

- Admin route not linked anywhere in public UI; `noindex` meta on all admin pages
- Admin code stored as bcrypt hash (never plaintext)
- 5-attempt lockout, 60s timeout
- RLS enforced on all tables
- Server-side duplicate submission guard in `FeedbackForm.tsx`
