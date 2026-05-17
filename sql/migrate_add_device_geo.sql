-- ============================================================================
-- Migration: add device, OS, browser and lat/lon columns to visits
-- ----------------------------------------------------------------------------
-- Run once in Supabase SQL Editor. Safe to re-run (all clauses are idempotent).
-- ============================================================================

alter table public.visits
  add column if not exists latitude        double precision,
  add column if not exists longitude       double precision,
  add column if not exists device_type     text,
  add column if not exists os_name         text,
  add column if not exists os_version      text,
  add column if not exists browser_name    text,
  add column if not exists browser_version text;

create index if not exists visits_os_idx     on public.visits (os_name);
create index if not exists visits_device_idx on public.visits (device_type);

-- Sanity check: list columns to confirm migration applied.
-- select column_name, data_type from information_schema.columns
-- where table_schema = 'public' and table_name = 'visits' order by ordinal_position;
