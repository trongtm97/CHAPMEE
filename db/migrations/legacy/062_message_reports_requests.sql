-- Allow reporting message requests before a conversation exists

alter table public.message_reports
  alter column conversation_id drop not null;

alter table public.message_reports
  add column if not exists message_request_id uuid references public.message_requests(id) on delete cascade;

alter table public.message_reports
  drop constraint if exists message_reports_target_check;

alter table public.message_reports
  add constraint message_reports_target_check check (
    conversation_id is not null or message_request_id is not null
  );

create index if not exists idx_message_reports_request
  on public.message_reports(message_request_id, created_at desc);

drop policy if exists "Users create message reports" on public.message_reports;

create policy "Users create message reports"
  on public.message_reports for insert
  to authenticated
  with check (
    auth.uid() = reporter_id
    and (
      (
        conversation_id is not null
        and public.is_conversation_participant(conversation_id, auth.uid())
      )
      or (
        message_request_id is not null
        and exists (
          select 1
          from public.message_requests mr
          where mr.id = message_request_id
            and mr.recipient_id = auth.uid()
        )
      )
    )
  );
