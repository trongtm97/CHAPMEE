-- Role center view permissions for admin role management page

insert into public.permissions (code, name, group_key) values
  ('admin.role.view', 'View roles and permissions', 'admin'),
  ('admin.user.role.view', 'View user role assignments', 'admin')
on conflict (code) do update set
  name = excluded.name,
  group_key = excluded.group_key;

-- Grant to admin, super_admin, owner
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('admin', 'super_admin', 'owner')
  and p.code in ('admin.role.view', 'admin.user.role.view')
on conflict do nothing;
