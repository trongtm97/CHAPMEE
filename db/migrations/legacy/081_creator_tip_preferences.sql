-- Studio: creator tip preferences (admin-controlled tips module still required).

alter table public.creator_monetization_profiles
  add column if not exists tips_accepted boolean not null default false,
  add column if not exists tip_thank_you_message text;

comment on column public.creator_monetization_profiles.tips_accepted is
  'Creator opts in to receive tips when admin tips.enabled is on.';

comment on column public.creator_monetization_profiles.tip_thank_you_message is
  'Short thank-you message shown after receiving a tip; no spam links.';
