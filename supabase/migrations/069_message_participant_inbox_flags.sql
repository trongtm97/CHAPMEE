-- Ẩn hội thoại phía từng user (không xóa tin / không ảnh hưởng người kia)

alter table public.conversation_participants
  add column if not exists hidden_at timestamptz;

comment on column public.conversation_participants.hidden_at is
  'Khi set: ẩn conversation khỏi inbox của user này; tin mới có thể clear để hiện lại.';

create index if not exists idx_conversation_participants_visible_inbox
  on public.conversation_participants (user_id, conversation_id)
  where hidden_at is null and is_archived = false;

-- Đếm unread chỉ trên hội thoại đang hiện trong inbox chính
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
    and cp.is_muted = false
    and cp.hidden_at is null
    and cp.is_archived = false;
$$;

grant execute on function public.get_unread_message_count(uuid) to authenticated;
