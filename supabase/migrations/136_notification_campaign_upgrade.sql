-- Migration 136: Notification campaign upgrade — href, dedupe constraint

alter table public.notification_campaigns
  add column if not exists href text;

alter table public.notification_campaigns
  drop constraint if exists notification_campaigns_href_check;

alter table public.notification_campaigns
  add constraint notification_campaigns_href_check check (
    href is null
    or (
      href ~ '^/'
      and href !~ '^//'
      and href !~* '^https?://'
    )
  );

create unique index if not exists user_notifications_user_campaign_unique
  on public.user_notifications(user_id, campaign_id)
  where campaign_id is not null;
