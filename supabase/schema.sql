-- ─────────────────────────────────────────────────────────────────
-- DFA19 Conference Feedback Portal — Multi-Module Supabase Schema
-- ─────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ─── Tables ──────────────────────────────────────────────────────

-- Form Modules / Events Table
create table if not exists events (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  subject      text not null,
  department   text not null,
  semester     text not null,
  event_date   text not null,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- Students Table (linked to event)
create table if not exists students (
  reg_no       text not null,
  event_id     uuid references events(id) on delete cascade,
  name         text not null,
  status       text not null default 'pending' check (status in ('pending','submitted')),
  submitted_at timestamptz,
  primary key (reg_no, event_id)
);

-- Submissions Table (linked to event)
create table if not exists submissions (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid references events(id) on delete cascade not null,
  reg_no        text not null,
  student_name  text not null,
  feedback_text text not null,
  file_urls     text[] default '{}',
  source        text not null default 'student' check (source in ('student','admin_added')),
  created_at    timestamptz default now()
);

-- Admin Access Table
create table if not exists admin_access (
  id           int primary key default 1,
  code_hash    text not null,
  attempts     int default 0,
  locked_until timestamptz
);

-- ─── Indexes ─────────────────────────────────────────────────────
create index if not exists idx_events_is_active on events(is_active);
create index if not exists idx_students_event_id on students(event_id);
create index if not exists idx_submissions_event_id on submissions(event_id);
create index if not exists idx_submissions_created_at on submissions(created_at desc);

-- ─── Row Level Security ──────────────────────────────────────────
alter table events       enable row level security;
alter table students     enable row level security;
alter table submissions  enable row level security;
alter table admin_access enable row level security;

drop policy if exists "public_read_events"       on events;
drop policy if exists "public_read_students"     on students;
drop policy if exists "public_insert_submission" on submissions;
drop policy if exists "public_read_submissions"  on submissions;
drop policy if exists "public_update_students"   on students;

create policy "public_read_events" on events for select using (true);
create policy "public_read_students" on students for select using (true);
create policy "public_read_submissions" on submissions for select using (true);

create policy "public_insert_submission" on submissions
  for insert with check (true);

create policy "public_update_students" on students
  for update using (true) with check (true);

-- Admin bypass / full access policies for service role
create policy "admin_all_events" on events for all using (true);
create policy "admin_all_students" on students for all using (true);
create policy "admin_all_submissions" on submissions for all using (true);

-- ─── Realtime ────────────────────────────────────────────────────
begin;
  alter publication supabase_realtime add table events;
  alter publication supabase_realtime add table submissions;
  alter publication supabase_realtime add table students;
commit;

-- ─── Admin Code Verification RPC ─────────────────────────────────
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
  if not found then return json_build_object('ok', false, 'locked_until', null); end if;
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
    update admin_access set attempts = v_row.attempts + 1,
      locked_until = case when v_row.attempts + 1 >= 5 then now() + interval '60 seconds' else null end
    where id = 1 returning locked_until into v_lock;
    return json_build_object('ok', false, 'locked_until', v_lock);
  end if;
end;
$$;

grant execute on function verify_admin_code(text) to anon;
grant execute on function verify_admin_code(text) to authenticated;

-- Default Admin Code Hash ("CSEAIML987")
INSERT INTO admin_access (id, code_hash, attempts)
VALUES (1, '$2a$10$qdvfcN68mKbgaN3Im6UXjehszQFUy.QcMosWQGBnp1OzxWXD8l5ZO', 0)
ON CONFLICT (id) DO UPDATE SET code_hash = '$2a$10$qdvfcN68mKbgaN3Im6UXjehszQFUy.QcMosWQGBnp1OzxWXD8l5ZO', attempts = 0;
