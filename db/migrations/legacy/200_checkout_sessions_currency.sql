-- Migration 200: Add currency to checkout_sessions for SePay/VND top-ups.
-- This keeps checkout session snapshots aligned with transaction currency.

alter table public.checkout_sessions
  add column if not exists currency text not null default 'VND';

comment on column public.checkout_sessions.currency is
  'Checkout session currency code. ChapMee top-ups currently use VND.';
