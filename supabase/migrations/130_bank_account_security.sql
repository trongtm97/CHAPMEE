-- Migration 130: Per-bank-account email verification and 24h withdrawal lock

alter table public.creator_payout_accounts
  add column if not exists withdrawal_locked_until timestamptz,
  add column if not exists email_verified_at timestamptz;

create index if not exists idx_creator_payout_accounts_creator_default
  on public.creator_payout_accounts(creator_user_id, is_default)
  where is_default = true;

-- Expand finance security log event types
alter table public.creator_finance_security_logs
  drop constraint if exists creator_finance_security_logs_event_type_check;

alter table public.creator_finance_security_logs
  add constraint creator_finance_security_logs_event_type_check
  check (
    event_type in (
      'withdrawal_pin_set',
      'withdrawal_pin_changed',
      'withdrawal_pin_failed',
      'withdrawal_pin_reset',
      'payout_profile_created',
      'payout_profile_changed',
      'payout_verification_requested',
      'payout_verification_completed',
      'payout_bank_change_locked',
      'bank_account_added',
      'bank_account_updated',
      'bank_account_deleted',
      'bank_account_default_set',
      'bank_account_email_verified',
      'finance_email_code_sent',
      'withdrawal_requested',
      'withdrawal_canceled'
    )
  );
