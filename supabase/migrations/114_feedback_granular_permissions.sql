-- Granular feedback permissions

insert into public.permissions (code, name, group_key)
values
  ('feedback.assign', 'Assign feedback tickets', 'feedback'),
  ('feedback.reply', 'Reply to feedback', 'feedback'),
  ('feedback.export', 'Export feedback data', 'feedback'),
  ('feedback.view.own', 'View own feedback', 'feedback')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code in (
  'feedback.assign',
  'feedback.reply',
  'feedback.export'
)
where r.code in ('support_admin', 'content_admin', 'finance_admin', 'super_admin', 'owner', 'admin')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code = 'feedback.view.own'
where r.code in ('reader', 'creator', 'verified_creator', 'vip_user')
on conflict do nothing;
