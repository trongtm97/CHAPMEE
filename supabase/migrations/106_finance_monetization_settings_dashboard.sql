-- Finance monetization settings dashboard: permissions + extended config keys

insert into public.permissions (code, name, group_key)
values
  ('finance.settings.view', 'View monetization / finance settings', 'finance'),
  ('finance.settings.update', 'Update monetization / finance settings', 'finance'),
  ('finance.audit.view', 'View finance settings audit history', 'finance')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code in (
  'finance.settings.view',
  'finance.settings.update',
  'finance.audit.view'
)
where r.code in ('finance_admin', 'super_admin', 'owner')
on conflict do nothing;

-- Grant view to legacy admin role (read-only); update stays with super_admin/owner/finance_admin
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code = 'finance.settings.view'
where r.code = 'admin'
on conflict do nothing;

insert into public.monetization_settings (key, value, description, is_public)
values
  ('coin.min_purchase_coins', '10'::jsonb, 'So coin toi thieu moi lan mua.', true),
  ('coin.max_purchase_coins', '100000'::jsonb, 'So coin toi da moi lan mua.', true),
  ('payout.allow_restricted_accounts', 'false'::jsonb, 'Cho phep rut khi tai khoan bi han che.', false),
  ('payout.allow_withdraw_quality_warning', 'false'::jsonb, 'Cho phep rut khi co canh bao chat luong noi dung.', false),
  ('payout.max_requests_per_day', '3'::jsonb, 'So yeu cau rut toi da moi ngay.', false),
  ('payout.max_amount_vnd_per_day', '0'::jsonb, 'So tien rut toi da moi ngay (0 = khong gioi han).', false),
  ('fraud.lock_revenue_on_severe_report', 'true'::jsonb, 'Tu khoa doanh thu khi bi report nghiem trong.', false),
  ('fraud.lock_revenue_on_low_quality', 'true'::jsonb, 'Tu khoa doanh thu khi noi dung chat luong thap.', false),
  ('fraud.lock_revenue_on_creator_warning', 'true'::jsonb, 'Tu khoa doanh thu khi tac gia bi canh bao.', false),
  ('fraud.lock_revenue_on_refund_dispute', 'true'::jsonb, 'Tu khoa doanh thu khi co tranh chap hoan coin.', false),
  ('fraud.revenue_lock_days', '30'::jsonb, 'So ngay giu doanh thu bi khoa.', false),
  ('fraud.allow_admin_manual_revenue_unlock', 'true'::jsonb, 'Cho phep admin mo khoa doanh thu thu cong.', false),
  ('revenue_share.paid_chapter_use_default', 'true'::jsonb, 'Chuong tra phi dung ty le mac dinh.', false),
  ('revenue_share.tip_use_default', 'true'::jsonb, 'Tip dung ty le mac dinh.', false),
  ('revenue_share.early_access_use_default', 'true'::jsonb, 'Early access dung ty le mac dinh.', false),
  ('revenue_share.vip_use_default', 'true'::jsonb, 'VIP dung ty le mac dinh.', false),
  ('revenue_share.fan_club_use_default', 'true'::jsonb, 'Fan club dung ty le mac dinh.', false),
  ('revenue_share.gift_use_default', 'true'::jsonb, 'Qua tang dung ty le mac dinh.', false),
  ('revenue_share.early_access_platform_percent', '40'::jsonb, 'Platform % cho early access (custom).', false),
  ('revenue_share.gift_platform_percent', '30'::jsonb, 'Platform % cho qua tang (custom).', false),
  ('revenue_share.fan_club_platform_percent', '30'::jsonb, 'Platform % cho fan club (custom).', false)
on conflict (key) do nothing;
