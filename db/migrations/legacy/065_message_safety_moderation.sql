-- Message safety: moderator delete status, deleted message visibility, unblock, staff updates

alter table public.messages
  drop constraint if exists messages_status_check;

alter table public.messages
  add constraint messages_status_check check (
    status in ('sent', 'delivered', 'failed', 'deleted', 'deleted_by_moderator')
  );

alter table public.message_reports
  add column if not exists resolution text;

drop policy if exists "Participants read messages" on public.messages;

create policy "Participants read messages"
  on public.messages for select
  to authenticated
  using (
    public.is_conversation_participant(conversation_id, auth.uid())
    and (
      body_safety_status <> 'review'
      or sender_id = auth.uid()
      or public.user_has_permission(auth.uid(), 'report.review')
    )
  );

drop policy if exists "Staff update messages for moderation" on public.messages;

create policy "Staff update messages for moderation"
  on public.messages for update
  to authenticated
  using (public.user_has_permission(auth.uid(), 'moderation.action.create'))
  with check (public.user_has_permission(auth.uid(), 'moderation.action.create'));

drop policy if exists "Users delete own blocks" on public.message_blocks;

create policy "Users delete own blocks"
  on public.message_blocks for delete
  to authenticated
  using (auth.uid() = blocker_id);
