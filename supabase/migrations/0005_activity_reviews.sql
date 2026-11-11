-- =====================================================================
-- EduLink — teacher review of a student's activity: comment + "Checked!"
-- One row per (activity, student). Run once in the SQL Editor.
-- =====================================================================

create table public.activity_reviews (
  activity_id  uuid not null references public.activities (id) on delete cascade,
  student_id   uuid not null references public.profiles (id) on delete cascade,
  comment      text not null default '',
  checked      boolean not null default false,
  checked_at   timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (activity_id, student_id)
);

create trigger activity_reviews_touch before update on public.activity_reviews
  for each row execute function public.touch_updated_at();

alter table public.activity_reviews enable row level security;

-- Is the current user the teacher of this activity?
create or replace function public.teaches_activity(act uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.activities where id = act and teacher_id = auth.uid())
$$;

-- Read: the student it's about, the activity's teacher, or admin
create policy "activity_reviews: read" on public.activity_reviews for select to authenticated
  using (student_id = auth.uid() or public.is_admin() or public.teaches_activity(activity_id));

-- Write: only the activity's teacher (or admin)
create policy "activity_reviews: insert" on public.activity_reviews for insert to authenticated
  with check (public.is_admin() or public.teaches_activity(activity_id));
create policy "activity_reviews: update" on public.activity_reviews for update to authenticated
  using (public.is_admin() or public.teaches_activity(activity_id))
  with check (public.is_admin() or public.teaches_activity(activity_id));
create policy "activity_reviews: delete" on public.activity_reviews for delete to authenticated
  using (public.is_admin() or public.teaches_activity(activity_id));
