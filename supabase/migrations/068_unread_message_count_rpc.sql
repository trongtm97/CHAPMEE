-- Đếm tin chưa đọc một lần (không fetch toàn bộ messages)

create or replace function public.get_unread_message_count(p_user_id uuid default auth.uid())
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.messages m
  inner join public.conversation_participants cp
    on cp.conversation_id = m.conversation_id
   and cp.user_id = p_user_id
  inner join public.conversations c
    on c.id = m.conversation_id
  where p_user_id = auth.uid()
    and c.status = 'active'
    and m.sender_id <> p_user_id
    and m.created_at > coalesce(cp.last_read_at, '1970-01-01'::timestamptz)
    and m.deleted_at is null
    and cp.is_muted = false;
$$;

grant execute on function public.get_unread_message_count(uuid) to authenticated;

create or replace function public.get_pending_message_request_count(
  p_user_id uuid default auth.uid()
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.message_requests mr
  where mr.recipient_id = p_user_id
    and p_user_id = auth.uid()
    and mr.status = 'pending';
$$;

grant execute on function public.get_pending_message_request_count(uuid) to authenticated;
