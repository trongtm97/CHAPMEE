-- Granular permissions for creator fee policy management

insert into public.permissions (code, name, group_key)
values
  ('finance.creator_fee.view', 'View creator fee policies', 'finance'),
  ('finance.creator_fee.create', 'Create creator fee policies', 'finance'),
  ('finance.creator_fee.update', 'Update creator fee policies', 'finance'),
  ('finance.creator_fee.pause', 'Pause creator fee policies', 'finance'),
  ('finance.creator_fee.revoke', 'Revoke creator fee policies', 'finance'),
  ('finance.creator_fee.export', 'Export creator fee policies', 'finance')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code in (
  'finance.creator_fee.view',
  'finance.creator_fee.create',
  'finance.creator_fee.update',
  'finance.creator_fee.pause',
  'finance.creator_fee.revoke',
  'finance.creator_fee.export'
)
where r.code in ('finance_admin', 'super_admin', 'owner')
on conflict do nothing;

-- Legacy wallet.adjust holders retain access via view permission grant above
