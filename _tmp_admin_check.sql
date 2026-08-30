select public.user_has_any_permission('33aee079-9430-4d82-a0d6-1682a51f4fb9', array['admin.dashboard.view','report.review','admin.user.view','admin.audit.view']) as can_access_admin,
       public.user_has_permission('33aee079-9430-4d82-a0d6-1682a51f4fb9','finance.dashboard.view') as can_access_finance,
       public.is_finance_staff('33aee079-9430-4d82-a0d6-1682a51f4fb9') as is_finance_staff,
       public.is_staff_moderator('33aee079-9430-4d82-a0d6-1682a51f4fb9') as is_staff_moderator;

select u.id,u.email,p.role,p.status
from public."user" u
left join public.profiles p on p.id=u.id
where u.email='trongtm.97@gmail.com';
