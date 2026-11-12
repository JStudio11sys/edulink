-- =====================================================================
-- EduLink — School Edition bookings (from the landing page)
-- A school books a call / meeting. Details are sent to them by email.
-- Anyone can send a booking; only the admin can see and manage them.
-- Run once in the SQL Editor.
-- =====================================================================

create table if not exists public.school_bookings (
  id            uuid primary key default gen_random_uuid(),
  plan          text not null check (plan in ('school', 'school-premium')),
  school_name   text not null check (char_length(school_name) between 2 and 200),
  contact_name  text not null check (char_length(contact_name) between 2 and 200),
  email         text not null check (char_length(email) between 5 and 200),
  mobile        text check (mobile is null or char_length(mobile) <= 40),
  preferred_at  timestamptz not null,      -- preferred date and time for the call / meeting
  status        text not null default 'new' check (status in ('new', 'scheduled', 'done')),
  created_at    timestamptz not null default now()
);

alter table public.school_bookings enable row level security;

-- Visitors (signed in or not) can send a booking, but never read any.
drop policy if exists "school_bookings: anyone can book" on public.school_bookings;
create policy "school_bookings: anyone can book" on public.school_bookings for insert to anon, authenticated
  with check (status = 'new');

-- Admin sees and manages all bookings.
drop policy if exists "school_bookings: admin" on public.school_bookings;
create policy "school_bookings: admin" on public.school_bookings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant insert on public.school_bookings to anon;
