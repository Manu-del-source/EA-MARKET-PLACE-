-- ============================================================
--  EA MARKETPLACE — Supabase Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. USERS (mirrors auth.users)
-- ─────────────────────────────────────────
create table if not exists public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text not null default 'Anonymous Trader',
  photo_url    text default '',
  seller_status text not null default 'none'
                check (seller_status in ('none', 'approved', 'admin')),
  balance      numeric not null default 5000,
  created_at   timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Allow reading other users (needed for admin portal)
create policy "Admins can read all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.seller_status = 'admin'
    )
  );

-- ─────────────────────────────────────────
-- 2. BOTS (Expert Advisors)
-- ─────────────────────────────────────────
create table if not exists public.bots (
  id             text primary key default ('ea_' || substr(gen_random_uuid()::text, 1, 8)),
  owner_id       uuid not null references public.users(id) on delete cascade,
  owner_name     text not null,
  name           text not null,
  description    text not null default '',
  category       text not null check (category in ('Forex','Crypto','Indices','Commodities')),
  platform       text not null check (platform in ('MT4','MT5','Both')),
  strategy       text not null check (strategy in ('Grid','Hedging','Scalping','Trend','Arbitrage','News')),
  price          numeric not null default 0,
  win_rate       numeric not null default 0,
  monthly_profit numeric not null default 0,
  max_drawdown   numeric not null default 0,
  downloads      integer not null default 0,
  rating         numeric not null default 0,
  status         text not null default 'active' check (status in ('active','inactive')),
  source_file_name text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.bots enable row level security;

create policy "Anyone can read active bots"
  on public.bots for select
  using (status = 'active' or auth.uid() = owner_id or
    exists (select 1 from public.users u where u.id = auth.uid() and u.seller_status = 'admin')
  );

create policy "Authenticated users can insert bots"
  on public.bots for insert
  with check (auth.uid() = owner_id);

create policy "Owner or admin can update bot"
  on public.bots for update
  using (auth.uid() = owner_id or
    exists (select 1 from public.users u where u.id = auth.uid() and u.seller_status = 'admin')
  );

create policy "Owner or admin can delete bot"
  on public.bots for delete
  using (auth.uid() = owner_id or
    exists (select 1 from public.users u where u.id = auth.uid() and u.seller_status = 'admin')
  );

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger bots_updated_at before update on public.bots
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────
-- 3. PURCHASES
-- ─────────────────────────────────────────
create table if not exists public.purchases (
  id            text primary key, -- `${userId}_${botId}`
  buyer_id      uuid not null references public.users(id) on delete cascade,
  bot_id        text not null references public.bots(id) on delete cascade,
  bot_name      text not null,
  price         numeric not null default 0,
  license_key   text not null,
  purchase_date timestamptz not null default now()
);

alter table public.purchases enable row level security;

create policy "Users can read own purchases"
  on public.purchases for select
  using (auth.uid() = buyer_id);

create policy "Users can insert own purchases"
  on public.purchases for insert
  with check (auth.uid() = buyer_id);

create policy "Admins can read all purchases"
  on public.purchases for select
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.seller_status = 'admin')
  );

-- ─────────────────────────────────────────
-- 4. REVIEWS
-- ─────────────────────────────────────────
create table if not exists public.reviews (
  id         text primary key, -- `${userId}_${botId}_rev`
  user_id    uuid not null references public.users(id) on delete cascade,
  user_name  text not null,
  user_photo text default '',
  bot_id     text not null references public.bots(id) on delete cascade,
  rating     integer not null check (rating between 1 and 5),
  comment    text not null,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "Anyone can read reviews"
  on public.reviews for select using (true);

create policy "Authenticated users can insert reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own reviews"
  on public.reviews for delete
  using (auth.uid() = user_id);

create policy "Admins can delete any review"
  on public.reviews for delete
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.seller_status = 'admin')
  );

-- ─────────────────────────────────────────
-- 5. REALTIME — enable for live updates
-- ─────────────────────────────────────────
alter publication supabase_realtime add table public.bots;
alter publication supabase_realtime add table public.purchases;
alter publication supabase_realtime add table public.users;

-- ─────────────────────────────────────────
-- 6. SEED — optional sample bots
-- ─────────────────────────────────────────
-- (Run after inserting at least one admin user)
-- insert into public.bots (owner_id, owner_name, name, ...) values (...);
