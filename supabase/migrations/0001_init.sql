-- =====================================================================
-- EduLink — initial schema
-- Run once in Supabase: SQL Editor → paste → Run.
--
-- Roles: admin, teacher, student
-- Login is username + password. Behind the scenes each account gets a
-- placeholder email "<username>@edulink.com" (never emailed).
-- Accounts are created by an Edge Function (admin → teachers,
-- teacher → students), so clients cannot write to profiles directly.
-- =====================================================================

-- ---------- Types ----------
create type public.user_role as enum ('admin', 'teacher', 'student');

-- ---------- Tables ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null,
  full_name   text not null,
  username    text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  created_by  uuid references public.profiles (id) on delete set null, -- teacher who created a student
  created_at  timestamptz not null default now()
);

create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- Which subjects a teacher teaches (set by admin)
create table public.teacher_subjects (
  teacher_id  uuid not null references public.profiles (id) on delete cascade,
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  primary key (teacher_id, subject_id)
);

-- A student enrolled in a subject, under a teacher
create table public.enrollments (
  student_id  uuid not null references public.profiles (id) on delete cascade,
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  teacher_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (student_id, subject_id)
);

create table public.activities (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references public.profiles (id) on delete cascade,
  subject_id    uuid not null references public.subjects (id) on delete cascade,
  title         text not null,
  instructions  text not null default '',
  due_at        timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One submission per student per activity. Cannot be edited or removed by the student.
create table public.submissions (
  id            uuid primary key default gen_random_uuid(),
  activity_id   uuid not null references public.activities (id) on delete cascade,
  student_id    uuid not null references public.profiles (id) on delete cascade,
  image_path    text not null,          -- path in storage bucket "submissions"
  text          text not null,          -- transcribed + student-edited text
  submitted_at  timestamptz not null default now(),
  unique (activity_id, student_id)
);

create index on public.enrollments (teacher_id);
create index on public.activities (subject_id, teacher_id);
create index on public.submissions (student_id);

-- ---------- Helper functions (security definer avoids RLS recursion) ----------
create or replace function public.my_role()
returns public.user_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- Is this student one of mine (I created them)?
create or replace function public.is_my_student(sid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = sid and p.role = 'student' and p.created_by = auth.uid()
  )
$$;

create or replace function public.teaches(sub uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teacher_subjects
    where teacher_id = auth.uid() and subject_id = sub
  )
$$;

-- Can the current student see this activity?
create or replace function public.enrolled_in_activity(act uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.activities a
    join public.enrollments e
      on e.subject_id = a.subject_id and e.teacher_id = a.teacher_id
    where a.id = act and e.student_id = auth.uid()
  )
$$;

-- Keep activities.updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger activities_touch before update on public.activities
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
alter table public.profiles         enable row level security;
alter table public.subjects         enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.enrollments      enable row level security;
alter table public.activities       enable row level security;
alter table public.submissions      enable row level security;

-- profiles: read only. All writes go through the Edge Function.
create policy "profiles: read own"            on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "profiles: admin reads all"     on public.profiles for select to authenticated
  using (public.is_admin());
create policy "profiles: teacher reads own students" on public.profiles for select to authenticated
  using (role = 'student' and created_by = auth.uid());
create policy "profiles: student reads own teachers" on public.profiles for select to authenticated
  using (exists (select 1 from public.enrollments e
                 where e.student_id = auth.uid() and e.teacher_id = profiles.id));

-- subjects: everyone signed in can read; admin manages
create policy "subjects: read"         on public.subjects for select to authenticated using (true);
create policy "subjects: admin insert" on public.subjects for insert to authenticated with check (public.is_admin());
create policy "subjects: admin update" on public.subjects for update to authenticated using (public.is_admin());
create policy "subjects: admin delete" on public.subjects for delete to authenticated using (public.is_admin());

-- teacher_subjects: admin manages; teachers read their own
create policy "teacher_subjects: read" on public.teacher_subjects for select to authenticated
  using (public.is_admin() or teacher_id = auth.uid());
create policy "teacher_subjects: admin insert" on public.teacher_subjects for insert to authenticated
  with check (public.is_admin());
create policy "teacher_subjects: admin delete" on public.teacher_subjects for delete to authenticated
  using (public.is_admin());

-- enrollments: teacher enrolls own students in subjects they teach
create policy "enrollments: read" on public.enrollments for select to authenticated
  using (public.is_admin() or teacher_id = auth.uid() or student_id = auth.uid());
create policy "enrollments: insert" on public.enrollments for insert to authenticated
  with check (
    public.is_admin()
    or (teacher_id = auth.uid() and public.is_my_student(student_id) and public.teaches(subject_id))
  );
create policy "enrollments: delete" on public.enrollments for delete to authenticated
  using (public.is_admin() or teacher_id = auth.uid());

-- activities: teacher manages own (only in subjects they teach); students read enrolled
create policy "activities: read" on public.activities for select to authenticated
  using (public.is_admin() or teacher_id = auth.uid() or public.enrolled_in_activity(id));
create policy "activities: insert" on public.activities for insert to authenticated
  with check (public.is_admin() or (teacher_id = auth.uid() and public.teaches(subject_id)));
create policy "activities: update" on public.activities for update to authenticated
  using (public.is_admin() or teacher_id = auth.uid())
  with check (public.is_admin() or (teacher_id = auth.uid() and public.teaches(subject_id)));
create policy "activities: delete" on public.activities for delete to authenticated
  using (public.is_admin() or teacher_id = auth.uid());

-- submissions: student inserts once; no student update/delete
create policy "submissions: read" on public.submissions for select to authenticated
  using (
    public.is_admin()
    or student_id = auth.uid()
    or exists (select 1 from public.activities a where a.id = activity_id and a.teacher_id = auth.uid())
  );
create policy "submissions: student insert" on public.submissions for insert to authenticated
  with check (
    student_id = auth.uid()
    and public.my_role() = 'student'
    and public.enrolled_in_activity(activity_id)
    and image_path like auth.uid()::text || '/%'
  );
create policy "submissions: admin delete" on public.submissions for delete to authenticated
  using (public.is_admin());

-- ---------- Storage: photos of handwritten work ----------
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

-- Students upload only into their own folder: <student_id>/<activity_id>/<file>
create policy "submission photos: student upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and public.my_role() = 'student'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- Read: the student, their teacher, or admin. No update/delete policies → photos are permanent.
create policy "submission photos: read" on storage.objects for select to authenticated
  using (
    bucket_id = 'submissions'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or public.is_my_student(((storage.foldername(name))[1])::uuid)
    )
  );

-- ---------- Starter subjects ----------
insert into public.subjects (name) values
  ('English Literature'), ('Math'), ('Biology'),
  ('Social Studies'), ('Computer Science'), ('Art')
on conflict (name) do nothing;
