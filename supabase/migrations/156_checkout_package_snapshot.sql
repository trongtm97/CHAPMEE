-- Migration 156: Persist coin pack snapshot on checkout for audit/immutability

alter table public.checkout_sessions
  add column if not exists package_snapshot_json jsonb;

comment on column public.checkout_sessions.package_snapshot_json is
  'Immutable coin pack snapshot at checkout creation time (amount/coin/bonus).';
