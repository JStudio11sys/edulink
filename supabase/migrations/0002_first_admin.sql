-- =====================================================================
-- EduLink — make the first admin
--
-- 1. Supabase → Authentication → Users → Add user → Create new user
--      Email:    admin@edulink.com
--      Password: (choose one)
--      Tick "Auto Confirm User"
-- 2. Then run this in the SQL Editor.
--
-- You will log in to EduLink with username "admin" and that password.
-- =====================================================================

insert into public.profiles (id, role, full_name, username)
select id, 'admin', 'Administrator', 'admin'
from auth.users
where email = 'admin@edulink.com'
on conflict (id) do update set role = 'admin';
