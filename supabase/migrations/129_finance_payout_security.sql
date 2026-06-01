-- Migration 129: Studio finance payout verification, email codes, bank-change lock

create table if not exists public.creator_payout_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  legal_name text,
  verification_email text,
  verification_status text not null default 'none' check (
    verification_status in (
      'none',
      'pending_email',
      'verified',
      'needs_reverification',
      'rejected'
    )
  ),
  verified_at timestamptz,
  needs_reverification_reason text,
  last_bank_change_at timestamptz,
  withdrawal_locked_until timestamptz,
  withdrawal_lock_reason text check (
    withdrawal_lock_reason is null
    or withdrawal_lock_reason in (
      'bank_account_changed',
      'pin_failed_too_many_times',
      'admin_manual'
    )
  ),
  default_payout_account_id uuid references public.creator_payout_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_touch_creator_payout_profiles_updated_at on public.creator_payout_profiles;
create trigger trg_touch_creator_payout_profiles_updated_at
before update on public.creator_payout_profiles
for each row
execute function public.touch_updated_at();

create table if not exists public.creator_finance_email_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  purpose text not null check (
    purpose in (
      'setup_pin',
      'change_pin',
      'reset_pin',
      'verify_payout',
      'change_bank_account',
      'withdrawal_request'
    )
  ),
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_creator_finance_email_codes_user_purpose
  on public.creator_finance_email_codes(user_id, purpose, created_at desc);

alter table public.creator_payout_accounts
  add column if not exists bank_branch text;

alter table public.creator_withdrawal_security
  add column if not exists pin_updated_at timestamptz;

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
      'finance_email_code_sent',
      'withdrawal_requested',
      'withdrawal_canceled'
    )
  );

alter table public.creator_payout_profiles enable row level security;
alter table public.creator_finance_email_codes enable row level security;

drop policy if exists "Creators manage own payout profile" on public.creator_payout_profiles;
create policy "Creators manage own payout profile"
  on public.creator_payout_profiles for all
  using (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creators manage own finance email codes" on public.creator_finance_email_codes;
create policy "Creators manage own finance email codes"
  on public.creator_finance_email_codes for all
  using (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()));
