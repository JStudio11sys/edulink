-- =====================================================================
-- EduLink — personal dashboard data (teachers & admin)
-- Each row belongs to one user; only that user can see or change it.
-- Run once in Supabase: SQL Editor → paste → Run.
-- =====================================================================

-- My tasks (task tracker)
create table public.personal_tasks (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title        text not null,
  description  text not null default '',
  tag          text not null default '',          -- free label, e.g. a subject or "Admin"
  due_date     date,
  status       text not null default 'todo' check (status in ('todo', 'progress', 'done')),
  progress     smallint not null default 0 check (progress between 0 and 100),
  created_at   timestamptz not null default now()
);

-- My notes
create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null,
  body        text not null default '',
  color       text not null default 'mint' check (color in ('mint', 'lilac', 'peach', 'sky')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- My schedule (weekly timetable)
create table public.timetable (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  weekday     smallint not null check (weekday between 1 and 7),   -- 1 = Monday … 7 = Sunday
  start_time  time not null,
  end_time    time not null,
  subject     text not null,
  room        text not null default '',
  created_at  timestamptz not null default now(),
  check (end_time > start_time)
);

create index on public.personal_tasks (owner_id);
create index on public.notes (owner_id);
create index on public.timetable (owner_id, weekday, start_time);

create trigger notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security: owner only ----------
alter table public.personal_tasks enable row level security;
alter table public.notes          enable row level security;
alter table public.timetable      enable row level security;

create policy "personal_tasks: owner" on public.personal_tasks for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "notes: owner" on public.notes for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "timetable: owner" on public.timetable for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
