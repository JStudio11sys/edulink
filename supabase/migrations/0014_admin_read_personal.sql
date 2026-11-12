-- =====================================================================
-- EduLink — admin can READ teachers' notes, to-dos and timetable
-- (for "View as teacher", which is view only). Owners keep full access.
-- Run once in the SQL Editor.
-- =====================================================================

drop policy if exists "personal_tasks: admin read" on public.personal_tasks;
create policy "personal_tasks: admin read" on public.personal_tasks for select to authenticated
  using (public.is_admin());

drop policy if exists "notes: admin read" on public.notes;
create policy "notes: admin read" on public.notes for select to authenticated
  using (public.is_admin());

drop policy if exists "timetable: admin read" on public.timetable;
create policy "timetable: admin read" on public.timetable for select to authenticated
  using (public.is_admin());
