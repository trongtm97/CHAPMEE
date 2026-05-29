-- Finance Command Center: granular permissions (idempotent)
insert into public.permissions (code, name, group_key)
values
  ('finance.report.export', 'Export finance reports', 'finance'),
  ('finance.refund.view', 'View refund queue and reports', 'finance'),
  ('finance.risk.view', 'View finance risk dashboard', 'finance')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code in (
  'finance.report.export',
  'finance.refund.view',
  'finance.risk.view'
)
where r.code in ('finance_admin', 'super_admin')
on conflict do nothing;
