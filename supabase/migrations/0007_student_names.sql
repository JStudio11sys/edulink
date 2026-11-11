-- =====================================================================
-- EduLink — last name / first name / sex on profiles
-- (class lists are ordered girls first, then by last name)
-- Run once in the SQL Editor.
-- =====================================================================

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name  text,
  add column if not exists sex        text check (sex in ('female', 'male'));

-- Fill in existing accounts from full_name: last word → last name, the rest → first name
update public.profiles
set
  last_name  = coalesce(last_name, regexp_replace(trim(full_name), '^.*\s', '')),
  first_name = coalesce(
    first_name,
    case when trim(full_name) ~ '\s' then regexp_replace(trim(full_name), '\s+\S+$', '') else trim(full_name) end
  )
where first_name is null or last_name is null;
