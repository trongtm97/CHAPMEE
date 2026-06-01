-- RBAC permissions for taxonomy admin center

insert into public.permissions (code, name, group_key)
values
  ('taxonomy.view', 'View taxonomy catalog', 'admin'),
  ('taxonomy.create', 'Create taxonomy terms', 'admin'),
  ('taxonomy.edit', 'Edit taxonomy terms', 'admin'),
  ('taxonomy.delete', 'Delete taxonomy terms', 'admin'),
  ('taxonomy.import', 'Import taxonomy terms', 'admin'),
  ('taxonomy.export', 'Export taxonomy terms', 'admin'),
  ('taxonomy.requests.review', 'Review taxonomy tag requests', 'admin'),
  ('taxonomy.templates.manage', 'Manage story format templates', 'admin')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code in (
  'taxonomy.view',
  'taxonomy.create',
  'taxonomy.edit',
  'taxonomy.delete',
  'taxonomy.import',
  'taxonomy.export',
  'taxonomy.requests.review',
  'taxonomy.templates.manage'
)
where r.code in ('admin', 'content_admin', 'super_admin', 'owner')
on conflict do nothing;
