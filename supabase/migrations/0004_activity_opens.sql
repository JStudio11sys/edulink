-- =====================================================================
-- EduLink — remember when a student first opens an activity
-- (used for the "In progress" label). Run once in the SQL Editor.
-- =====================================================================

create table public.activity_opens (
  student_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  activity_id  uuid not null references public.activities (id) on delete cascade,
  opened_at    timestamptz not null default now(),
  primary key (student_id, activity_id)
);

alter table public.activity_opens enable row level security;

-- Read: the student, the activity's teacher, or admin
create policy "activity_opens: read" on public.activity_opens for select to authenticated
  using (
    student_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.activities a where a.id = activity_id and a.teacher_id = auth.uid())
  );

-- Insert: only the student, only for activities they can see. First open is kept (no updates).
create policy "activity_opens: student insert" on public.activity_opens for insert to authenticated
  with check (
    student_id = auth.uid()
    and public.my_role() = 'student'
    and public.enrolled_in_activity(activity_id)
  );
