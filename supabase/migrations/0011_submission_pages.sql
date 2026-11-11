-- =====================================================================
-- EduLink — Phase 3: several photos (pages) per submission, in order
-- image_paths keeps the pages in order (page 1 first). image_path stays
-- as page 1 so older code keeps working.
-- Run once in the SQL Editor.
-- =====================================================================

alter table public.submissions
  add column if not exists image_paths text[] not null default '{}';

-- Existing submissions: their one photo becomes page 1
update public.submissions
set image_paths = array[image_path]
where cardinality(image_paths) = 0 and image_path is not null;

-- Every page must be inside the student's own folder: <student_id>/...
create or replace function public.paths_in_folder(paths text[], folder uuid)
returns boolean language sql immutable as $$
  select coalesce(bool_and(p like folder::text || '/%'), true) from unnest(paths) as p
$$;

drop policy if exists "submissions: student insert" on public.submissions;
create policy "submissions: student insert" on public.submissions for insert to authenticated
  with check (
    student_id = auth.uid()
    and submitted_by = auth.uid()
    and public.my_role() = 'student'
    and public.student_sees_activity(activity_id)
    and image_path like auth.uid()::text || '/%'
    and public.paths_in_folder(image_paths, auth.uid())
    and cardinality(image_paths) between 1 and 10
  );

drop policy if exists "submissions: teacher insert" on public.submissions;
create policy "submissions: teacher insert" on public.submissions for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and public.owns_activity(activity_id)
    and public.is_my_student(student_id)
    and image_path like student_id::text || '/%'
    and public.paths_in_folder(image_paths, student_id)
    and cardinality(image_paths) between 1 and 10
  );
