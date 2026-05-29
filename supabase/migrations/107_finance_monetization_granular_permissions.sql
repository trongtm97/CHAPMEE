-- Granular finance settings permissions for monetization dashboard

insert into public.permissions (code, name, group_key)
values
  ('finance.revenue_share.update', 'Update revenue share settings', 'finance'),
  ('finance.withdrawal_settings.update', 'Update withdrawal settings', 'finance'),
  ('finance.risk_settings.update', 'Update revenue lock / risk settings', 'finance')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code in (
  'finance.revenue_share.update',
  'finance.withdrawal_settings.update',
  'finance.risk_settings.update'
)
where r.code in ('finance_admin', 'super_admin', 'owner')
on conflict do nothing;
