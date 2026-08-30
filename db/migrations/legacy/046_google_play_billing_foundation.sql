-- Migration 046: Google Play Billing foundation defaults and idempotency guards

insert into public.monetization_settings (key, value, description, is_public)
values
  ('payments.provider_google_play_billing_enabled', 'false'::jsonb, 'Bat Google Play Billing provider.', true),
  ('payments.google_play.test_mode', 'true'::jsonb, 'Google Play Billing test mode.', false),
  ('payments.google_play.default_store_fee_percent', '15'::jsonb, 'Google Play fee mac dinh (%).', false),
  ('payments.google_play.standard_fee_percent', '30'::jsonb, 'Google Play standard fee (%).', false),
  ('payments.google_play.use_reduced_fee_estimate', 'true'::jsonb, 'Dung reduced fee estimate cho Google Play.', false),
  ('payments.google_play.package_name', '"com.chapchap.app"'::jsonb, 'Android package name de verify purchase token.', false),
  ('payments.google_play.credentials_configured', 'false'::jsonb, 'Danh dau da cau hinh Google credentials.', false)
on conflict (key) do nothing;

insert into public.payment_provider_settings (provider_key, enabled, test_mode, public_config)
values ('google_play_billing', false, true, '{}'::jsonb)
on conflict (provider_key) do nothing;

create unique index if not exists idx_checkout_google_play_purchase_tuple_unique
  on public.checkout_sessions (
    (provider_payload ->> 'purchaseToken'),
    coalesce(provider_payload ->> 'orderId', ''),
    (provider_payload ->> 'productId')
  )
  where provider = 'google_play_billing'
    and provider_payload ? 'purchaseToken'
    and provider_payload ? 'productId';
