-- =====================================================================
-- EduLink — Phase 2: private answer keys
--
-- The test structure (parts, item counts, points, essay rubrics) lives in
-- activities.parts and students may see it. The ANSWERS live here, and
-- only the activity's teacher (or admin) can read or write them.
-- Run once in the SQL Editor.
-- =====================================================================

create table public.activity_keys (
  activity_id  uuid primary key references public.activities (id) on delete cascade,
  answers      jsonb not null default '{}'::jsonb,   -- { "<partId>": ["T","F","A",...] }
  updated_at   timestamptz not null default now()
);

create trigger activity_keys_touch before update on public.activity_keys
  for each row execute function public.touch_updated_at();

alter table public.activity_keys enable row level security;

create policy "activity_keys: teacher only" on public.activity_keys for all to authenticated
  using (public.is_admin() or public.owns_activity(activity_id))
  with check (public.is_admin() or public.owns_activity(activity_id));
