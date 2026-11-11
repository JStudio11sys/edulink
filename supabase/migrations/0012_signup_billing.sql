-- =====================================================================
-- EduLink — self sign-up with username + email code, and subscriptions
-- Run once in the SQL Editor.
-- =====================================================================

-- ---------- Username check before signing up (true = free to use) ----------
create or replace function public.username_available(u text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where username = lower(trim(u)))
$$;
grant execute on function public.username_available(text) to anon, authenticated;

-- ---------- Create the teacher profile when someone signs up ----------
-- The sign-up form sends { signup_role: "teacher", full_name, username } as user metadata.
-- Accounts created by the admin/teacher tools don't send signup_role, so they're untouched.
create or replace function public.handle_teacher_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'signup_role', '') = 'teacher' then
    insert into public.profiles (id, role, full_name, username)
    values (
      new.id,
      'teacher',
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
      lower(trim(new.raw_user_meta_data ->> 'username'))
    );
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_signup on auth.users;
create trigger on_auth_user_signup
  after insert on auth.users
  for each row execute function public.handle_teacher_signup();

-- ---------- Subscriptions (one row per teacher) ----------
create table if not exists public.subscriptions (
  teacher_id          uuid primary key references public.profiles (id) on delete cascade,
  plan                text not null check (plan in ('trial', 'monthly', 'yearly')),
  status              text not null default 'active' check (status in ('active', 'canceled')),
  trial_used          boolean not null default false,
  current_period_end  timestamptz not null,
  last_payment        jsonb,          -- demo receipt: { method, reference, amount, paid_at }
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

alter table public.subscriptions enable row level security;

-- Teachers read their own plan; admin reads all. Writes only through the "billing" Edge Function.
drop policy if exists "subscriptions: read own" on public.subscriptions;
create policy "subscriptions: read own" on public.subscriptions for select to authenticated
  using (teacher_id = auth.uid() or public.is_admin());
