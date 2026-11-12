-- =====================================================================
-- EduLink — first-time teacher guide
-- Remembers when a teacher finished or skipped the guide.
-- Run once in the SQL Editor.
-- =====================================================================

alter table public.profiles add column if not exists guide_done boolean not null default false;

-- Marks the guide as done for the signed-in user.
create or replace function public.finish_guide()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set guide_done = true where id = auth.uid()
$$;
grant execute on function public.finish_guide() to authenticated;
