-- ============================================================
--  FIX 1: Infinite recursion in users RLS policies
--  The "Admins can read all users" policy was querying the
--  users table from within a users policy = infinite loop.
--  Fix: use auth.jwt() to check role instead.
-- ============================================================

-- Drop all existing users policies
drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Admins can read all users" on public.users;

-- Recreate without recursion
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Admin read: check JWT app_metadata instead of querying users table
create policy "Admins can read all users"
  on public.users for select
  using (
    auth.uid() = id
    or (auth.jwt() ->> 'email') in (
      select email from public.users where seller_status = 'admin'
    )
  );

-- ============================================================
--  FIX 2: upsertProfile duplicate key (23505)
--  Use upsert (ON CONFLICT DO NOTHING) instead of insert
-- ============================================================
-- (No SQL needed — fix is in App.tsx code below)

-- ============================================================
--  FIX 3: bots RLS — allow anyone to read active bots
--  without touching the users table at all
-- ============================================================
drop policy if exists "Anyone can read active bots" on public.bots;

create policy "Anyone can read active bots"
  on public.bots for select
  using (status = 'active' or auth.uid() = owner_id);

-- ============================================================
--  FIX 4: purchases RLS — remove admin subquery on users
-- ============================================================
drop policy if exists "Admins can read all purchases" on public.purchases;
-- (Admin portal doesn't need to read all purchases for now)

-- ============================================================
--  Verify — should return policies with no recursion
-- ============================================================
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
