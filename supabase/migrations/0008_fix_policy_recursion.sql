-- =====================================================================
-- EduLink — fix "infinite recursion detected in policy for relation classes"
--
-- The classes policy read subjects, and the subjects policy read classes,
-- so Postgres looped. These helper functions run as "security definer",
-- which skips the other table's policy and breaks the loop.
-- Run once in the SQL Editor.
-- =====================================================================

-- Does the current teacher own this subject?
create or replace function public.owns_subject(sub uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.subjects where id = sub and teacher_id = auth.uid())
$$;

-- Is this subject taught to the current student's section?
create or replace function public.subject_in_my_section(sub uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.classes c
    where c.subject_id = sub and c.section_id = public.my_section()
  )
$$;

-- subjects: student read rule without touching classes' policy
drop policy if exists "subjects: student reads own" on public.subjects;
create policy "subjects: student reads own" on public.subjects for select to authenticated
  using (public.subject_in_my_section(id));

-- classes: owner rule without touching subjects' policy
drop policy if exists "classes: owner" on public.classes;
create policy "classes: owner" on public.classes for all to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (teacher_id = auth.uid() and public.owns_section(section_id) and public.owns_subject(subject_id))
  );

-- activities: same pattern (avoid reading subjects through its policy)
drop policy if exists "activities: owner" on public.activities;
create policy "activities: owner" on public.activities for all to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (public.is_admin() or (teacher_id = auth.uid() and public.owns_subject(subject_id)));
