-- =====================================================================
-- EduLink — Phase 4: scores (teacher only — students never see scores)
-- One row per (activity, student). "details" holds the per-item check
-- and essay rubric points; the teacher can adjust and confirm.
-- Run once in the SQL Editor.
-- =====================================================================

create table public.activity_scores (
  activity_id  uuid not null references public.activities (id) on delete cascade,
  student_id   uuid not null references public.profiles (id) on delete cascade,
  score        numeric not null default 0,
  max_score    numeric not null default 0,
  details      jsonb not null default '{}'::jsonb,
  confirmed    boolean not null default false,
  graded_at    timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (activity_id, student_id)
);

create trigger activity_scores_touch before update on public.activity_scores
  for each row execute function public.touch_updated_at();

alter table public.activity_scores enable row level security;

-- Only the activity's teacher (or admin). No student policy at all → students can't read scores.
create policy "activity_scores: teacher only" on public.activity_scores for all to authenticated
  using (public.is_admin() or public.owns_activity(activity_id))
  with check (public.is_admin() or public.owns_activity(activity_id));
