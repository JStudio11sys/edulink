-- =====================================================================
-- EduLink — Phase 1: teacher-owned sections, subjects and classes
--
-- ⚠ Clears the old TEST data: subjects, teacher_subjects, enrollments,
--   activities, submissions, activity_opens, activity_reviews.
--   Accounts (profiles), notes, personal tasks and timetables are kept.
--   Old submission photos stay in Storage → "submissions" bucket; delete
--   them there by hand if you like.
--
-- Run once in Supabase: SQL Editor → paste → Run.
-- =====================================================================

-- ---------- 1. Remove the old structure ----------
drop policy if exists "profiles: student reads own teachers" on public.profiles;

drop table if exists public.activity_reviews  cascade;
drop table if exists public.activity_opens    cascade;
drop table if exists public.submissions       cascade;
drop table if exists public.activities        cascade;
drop table if exists public.enrollments       cascade;
drop table if exists public.teacher_subjects  cascade;
drop table if exists public.subjects          cascade;

drop function if exists public.enrolled_in_activity(uuid);
drop function if exists public.teaches(uuid);
drop function if exists public.teaches_activity(uuid);

-- ---------- 2. Types ----------
do $$ begin
  create type public.activity_category as enum ('written', 'performance', 'summative', 'assessment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.activity_mode as enum ('home', 'f2f');
exception when duplicate_object then null; end $$;

-- ---------- 3. Tables (everything belongs to a teacher) ----------
create table public.sections (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (teacher_id, name)
);

create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (teacher_id, name)
);

-- A class = one subject taught to one section
create table public.classes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  section_id  uuid not null references public.sections (id) on delete cascade,
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (section_id, subject_id)
);

-- A student belongs to one section
create table public.section_students (
  student_id  uuid primary key references public.profiles (id) on delete cascade,
  section_id  uuid not null references public.sections (id) on delete cascade,
  added_at    timestamptz not null default now()
);

create table public.activities (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  subject_id    uuid not null references public.subjects (id) on delete cascade,
  title         text not null,
  instructions  text not null default '',
  category      public.activity_category not null default 'written',
  mode          public.activity_mode not null default 'home',   -- home: student submits · f2f: teacher captures
  parts         jsonb not null default '[]'::jsonb,             -- test parts / answer key / rubric (Phase 2)
  due_at        timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger activities_touch before update on public.activities
  for each row execute function public.touch_updated_at();

-- Which sections an activity is given to (same subject, one or more sections)
create table public.activity_sections (
  activity_id  uuid not null references public.activities (id) on delete cascade,
  section_id   uuid not null references public.sections (id) on delete cascade,
  primary key (activity_id, section_id)
);

create table public.submissions (
  id            uuid primary key default gen_random_uuid(),
  activity_id   uuid not null references public.activities (id) on delete cascade,
  student_id    uuid not null references public.profiles (id) on delete cascade,
  submitted_by  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  image_path    text not null,
  text          text not null,
  submitted_at  timestamptz not null default now(),
  unique (activity_id, student_id)
);

create table public.activity_opens (
  student_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  activity_id  uuid not null references public.activities (id) on delete cascade,
  opened_at    timestamptz not null default now(),
  primary key (student_id, activity_id)
);

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

create index on public.classes (teacher_id);
create index on public.section_students (section_id);
create index on public.activities (teacher_id, subject_id);
create index on public.activity_sections (section_id);
create index on public.submissions (student_id);

-- ---------- 4. Helper functions ----------
-- The current student's section
create or replace function public.my_section()
returns uuid language sql stable security definer set search_path = '' as $$
  select section_id from public.section_students where student_id = auth.uid()
$$;

create or replace function public.owns_activity(act uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.activities where id = act and teacher_id = auth.uid())
$$;

-- Student can see an activity: it's "at home" and given to their section
create or replace function public.student_sees_activity(act uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.activities a
    join public.activity_sections s on s.activity_id = a.id
    where a.id = act and a.mode = 'home' and s.section_id = public.my_section()
  )
$$;

-- Teacher owns this section
create or replace function public.owns_section(sec uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sections where id = sec and teacher_id = auth.uid())
$$;

-- ---------- 5. Row Level Security ----------
alter table public.sections          enable row level security;
alter table public.subjects          enable row level security;
alter table public.classes           enable row level security;
alter table public.section_students  enable row level security;
alter table public.activities        enable row level security;
alter table public.activity_sections enable row level security;
alter table public.submissions       enable row level security;
alter table public.activity_opens    enable row level security;
alter table public.activity_reviews  enable row level security;

-- Students can read their teacher's profile (name on activities)
create or replace function public.my_teacher()
returns uuid language sql stable security definer set search_path = '' as $$
  select created_by from public.profiles where id = auth.uid()
$$;
drop policy if exists "profiles: student reads own teacher" on public.profiles;
create policy "profiles: student reads own teacher" on public.profiles for select to authenticated
  using (id = public.my_teacher());

-- sections: owner manages; student reads own; admin all
create policy "sections: owner" on public.sections for all to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (teacher_id = auth.uid() or public.is_admin());
create policy "sections: student reads own" on public.sections for select to authenticated
  using (id = public.my_section());

-- subjects: owner manages; student reads subjects of their section's classes
create policy "subjects: owner" on public.subjects for all to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (teacher_id = auth.uid() or public.is_admin());
create policy "subjects: student reads own" on public.subjects for select to authenticated
  using (exists (select 1 from public.classes c where c.subject_id = subjects.id and c.section_id = public.my_section()));

-- classes: owner manages (only own section + own subject); student reads own section's classes
create policy "classes: owner" on public.classes for all to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      teacher_id = auth.uid()
      and public.owns_section(section_id)
      and exists (select 1 from public.subjects s where s.id = subject_id and s.teacher_id = auth.uid())
    )
  );
create policy "classes: student reads own" on public.classes for select to authenticated
  using (section_id = public.my_section());

-- section_students: teacher puts own students in own sections
create policy "section_students: owner" on public.section_students for all to authenticated
  using (public.is_admin() or public.owns_section(section_id))
  with check (public.is_admin() or (public.owns_section(section_id) and public.is_my_student(student_id)));
create policy "section_students: student reads own" on public.section_students for select to authenticated
  using (student_id = auth.uid());

-- activities: owner manages (own subject); students read "at home" ones for their section
create policy "activities: owner" on public.activities for all to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (teacher_id = auth.uid() and exists (select 1 from public.subjects s where s.id = subject_id and s.teacher_id = auth.uid()))
  );
create policy "activities: student reads" on public.activities for select to authenticated
  using (public.student_sees_activity(id));

-- activity_sections: owner manages; students read rows for their section
create policy "activity_sections: owner" on public.activity_sections for all to authenticated
  using (public.is_admin() or public.owns_activity(activity_id))
  with check (public.is_admin() or (public.owns_activity(activity_id) and public.owns_section(section_id)));
create policy "activity_sections: student reads" on public.activity_sections for select to authenticated
  using (section_id = public.my_section());

-- submissions: student submits "at home" work once; teacher can submit for own students (face to face);
-- nobody but admin can change or delete them
create policy "submissions: read" on public.submissions for select to authenticated
  using (student_id = auth.uid() or public.is_admin() or public.owns_activity(activity_id));
create policy "submissions: student insert" on public.submissions for insert to authenticated
  with check (
    student_id = auth.uid()
    and submitted_by = auth.uid()
    and public.my_role() = 'student'
    and public.student_sees_activity(activity_id)
    and image_path like auth.uid()::text || '/%'
  );
create policy "submissions: teacher insert" on public.submissions for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and public.owns_activity(activity_id)
    and public.is_my_student(student_id)
    and image_path like student_id::text || '/%'
  );
create policy "submissions: admin delete" on public.submissions for delete to authenticated
  using (public.is_admin());

-- activity_opens ("In progress")
create policy "activity_opens: read" on public.activity_opens for select to authenticated
  using (student_id = auth.uid() or public.is_admin() or public.owns_activity(activity_id));
create policy "activity_opens: student insert" on public.activity_opens for insert to authenticated
  with check (student_id = auth.uid() and public.my_role() = 'student' and public.student_sees_activity(activity_id));

-- activity_reviews (comment + Checked!)
create policy "activity_reviews: read" on public.activity_reviews for select to authenticated
  using (student_id = auth.uid() or public.is_admin() or public.owns_activity(activity_id));
create policy "activity_reviews: write" on public.activity_reviews for all to authenticated
  using (public.is_admin() or public.owns_activity(activity_id))
  with check (public.is_admin() or public.owns_activity(activity_id));

-- ---------- 6. Storage: teachers may upload photos for their own students (face to face) ----------
drop policy if exists "submission photos: teacher upload" on storage.objects;
create policy "submission photos: teacher upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and public.my_role() = 'teacher'
    and public.is_my_student(((storage.foldername(name))[1])::uuid)
  );
