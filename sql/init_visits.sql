-- ============================================================================
-- gerardobarberena.com  —  analytics schema
-- ----------------------------------------------------------------------------
-- Run this in Supabase Studio:
--   1. Open your project at https://supabase.com/dashboard
--   2. SQL Editor (left sidebar) -> New query
--   3. Paste this whole file -> Run
--
-- It creates a `visits` table, indexes, and Row-Level Security policies so:
--   - The public site (anon role) can INSERT visit rows but NOT read them.
--   - Only the admin (auth email = gerardo.barberena@icloud.com) can SELECT.
-- ============================================================================

create table if not exists public.visits (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  path        text,
  referrer    text,
  lang        text,
  viewport_w  int,
  viewport_h  int,
  user_agent  text,
  country     text
);

-- Indexes for the dashboard's typical group-by queries.
create index if not exists visits_created_at_idx on public.visits (created_at desc);
create index if not exists visits_lang_idx       on public.visits (lang);
create index if not exists visits_country_idx    on public.visits (country);
create index if not exists visits_path_idx       on public.visits (path);

-- Make sure the REST API can see the table (in case auto-expose was disabled).
grant insert on public.visits to anon;
grant select on public.visits to authenticated;
grant usage, select on sequence public.visits_id_seq to anon;

-- Lock it down.
alter table public.visits enable row level security;

-- Anyone (anon) can insert rows — that's how the public site reports visits.
drop policy if exists "anon can insert visits" on public.visits;
create policy "anon can insert visits"
  on public.visits
  for insert
  to anon
  with check (true);

-- Only the admin email can read rows.
drop policy if exists "owner can read visits" on public.visits;
create policy "owner can read visits"
  on public.visits
  for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'gerardo.barberena@icloud.com');

-- Sanity check (returns 0 rows on a fresh project):
-- select count(*) from public.visits;
