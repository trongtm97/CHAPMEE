-- Migration 105: Admin withdrawal queue fields + creator payout notifications

alter table public.payout_requests
  add column if not exists payment_reference text,
  add column if not exists paid_at timestamptz,
  add column if not exists risk_level text not null default 'normal'
    check (risk_level in ('normal', 'warning', 'high'));

create index if not exists idx_payout_requests_payment_reference
  on public.payout_requests(payment_reference)
  where payment_reference is not null;

alter type public.notification_type add value if not exists 'creator_withdrawal_processing';
alter type public.notification_type add value if not exists 'creator_withdrawal_paid';
alter type public.notification_type add value if not exists 'creator_withdrawal_failed';

alter table public.notifications drop constraint if exists notifications_target_type_check;
alter table public.notifications add constraint notifications_target_type_check check (
  target_type is null
  or target_type in (
    'story', 'chapter', 'comment', 'author', 'challenge', 'milestone', 'profile',
    'wallet', 'payout_request'
  )
);
