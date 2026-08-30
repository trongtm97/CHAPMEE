-- Fix: prevent users from joining arbitrary conversations via participant INSERT.
-- Fix: create 1:1 conversations with both participants via SECURITY DEFINER RPC.

drop policy if exists "Users insert self as participant" on public.conversation_participants;

create policy "Users insert self as only participant on empty conversation"
  on public.conversation_participants for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
    )
  );

create or replace function public.create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv_id uuid;
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;

  if v_caller = other_user_id then
    raise exception 'cannot_message_self';
  end if;

  if public.is_message_blocked(v_caller, other_user_id) then
    raise exception 'blocked';
  end if;

  select cp_a.conversation_id
  into v_conv_id
  from public.conversation_participants cp_a
  inner join public.conversation_participants cp_b
    on cp_a.conversation_id = cp_b.conversation_id
  inner join public.conversations c
    on c.id = cp_a.conversation_id
  where cp_a.user_id = v_caller
    and cp_b.user_id = other_user_id
    and c.type = 'direct'
  limit 1;

  if v_conv_id is not null then
    update public.conversations
    set status = 'active', updated_at = now()
    where id = v_conv_id;
    return v_conv_id;
  end if;

  insert into public.conversations (type, status)
  values ('direct', 'active')
  returning id into v_conv_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conv_id, v_caller), (v_conv_id, other_user_id);

  return v_conv_id;
end;
$$;

revoke all on function public.create_direct_conversation(uuid) from public;
grant execute on function public.create_direct_conversation(uuid) to authenticated;
