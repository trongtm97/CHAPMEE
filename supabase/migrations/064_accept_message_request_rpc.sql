-- Accept message request: create conversation + first message (bypass RLS sender mismatch)

create or replace function public.accept_message_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid := auth.uid();
  v_request public.message_requests%rowtype;
  v_conv_id uuid;
  v_preview text;
begin
  if v_recipient is null then
    raise exception 'not_authenticated';
  end if;

  select *
  into v_request
  from public.message_requests
  where id = p_request_id
    and recipient_id = v_recipient
    and status = 'pending'
  for update;

  if not found then
    raise exception 'invalid_request';
  end if;

  if public.is_message_blocked(v_request.requester_id, v_recipient) then
    raise exception 'blocked';
  end if;

  v_conv_id := public.create_direct_conversation(v_request.requester_id);

  v_preview := v_request.first_message;
  if char_length(v_preview) > 120 then
    v_preview := left(v_preview, 117) || '...';
  end if;

  insert into public.messages (
    conversation_id,
    sender_id,
    body,
    body_safety_status,
    status
  )
  values (
    v_conv_id,
    v_request.requester_id,
    v_request.first_message,
    'clean',
    'sent'
  );

  update public.conversations
  set
    status = 'active',
    last_message_at = now(),
    last_message_preview = v_preview,
    updated_at = now()
  where id = v_conv_id;

  update public.message_requests
  set
    status = 'accepted',
    conversation_id = v_conv_id,
    responded_at = now()
  where id = p_request_id;

  return v_conv_id;
end;
$$;

revoke all on function public.accept_message_request(uuid) from public;
grant execute on function public.accept_message_request(uuid) to authenticated;

-- Requester cannot accept own request
drop policy if exists "Recipient updates message requests" on public.message_requests;

create policy "Recipient updates message requests"
  on public.message_requests for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create policy "Requester updates own pending request message"
  on public.message_requests for update
  to authenticated
  using (auth.uid() = requester_id and status = 'pending')
  with check (auth.uid() = requester_id and status = 'pending');
