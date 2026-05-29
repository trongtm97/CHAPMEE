-- Migration 061: Direct messaging MVP (1-1, requests, blocks, reports, privacy)

-- ---------------------------------------------------------------------------
-- Notification types
-- ---------------------------------------------------------------------------
alter type public.notification_type add value if not exists 'new_message';
alter type public.notification_type add value if not exists 'new_message_request';
alter type public.notification_type add value if not exists 'message_request_accepted';
alter type public.notification_type add value if not exists 'message_report_resolved';
alter type public.notification_type add value if not exists 'message_restriction_applied';

-- ---------------------------------------------------------------------------
-- Account restriction types for messaging
-- ---------------------------------------------------------------------------
alter table public.account_restrictions
  drop constraint if exists account_restrictions_type_check;

alter table public.account_restrictions
  add constraint account_restrictions_type_check check (
    restriction_type in (
      'comment_block', 'post_block', 'story_publish_block',
      'creator_monetization_hold', 'payout_hold', 'recommendation_limited',
      'account_suspended', 'account_banned', 'report_block',
      'message_block_24h', 'message_block_7d', 'message_block_30d', 'message_banned'
    )
  );

-- ---------------------------------------------------------------------------
-- Privacy settings
-- ---------------------------------------------------------------------------
create table if not exists public.message_privacy_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  who_can_message text not null default 'followers_only',
  allow_message_requests boolean not null default true,
  filter_sensitive_messages boolean not null default true,
  block_links_from_strangers boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint message_privacy_who_check check (
    who_can_message in ('everyone', 'followers_only', 'mutual_follow_only', 'no_one')
  )
);

-- ---------------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text,
  constraint conversations_type_check check (type in ('direct')),
  constraint conversations_status_check check (
    status in ('pending', 'active', 'archived', 'blocked')
  )
);

create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  is_archived boolean not null default false,
  is_muted boolean not null default false,
  constraint conversation_participants_unique unique (conversation_id, user_id),
  constraint conversation_participants_role_check check (role in ('member', 'admin'))
);

create index if not exists idx_conversation_participants_user
  on public.conversation_participants(user_id, joined_at desc);

create index if not exists idx_conversations_last_message
  on public.conversations(last_message_at desc nulls last);

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  body_safety_status text not null default 'clean',
  status text not null default 'sent',
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint messages_body_length check (char_length(body) <= 1000),
  constraint messages_safety_check check (
    body_safety_status in ('clean', 'warning', 'blocked', 'review', 'hidden')
  ),
  constraint messages_status_check check (
    status in ('sent', 'delivered', 'failed', 'deleted')
  )
);

create index if not exists idx_messages_conversation_created
  on public.messages(conversation_id, created_at desc);

create index if not exists idx_messages_sender_created
  on public.messages(sender_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Message requests
-- ---------------------------------------------------------------------------
create table if not exists public.message_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  first_message text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint message_requests_no_self check (requester_id <> recipient_id),
  constraint message_requests_status_check check (
    status in ('pending', 'accepted', 'rejected', 'blocked')
  ),
  constraint message_requests_first_length check (char_length(first_message) <= 1000)
);

create index if not exists idx_message_requests_recipient
  on public.message_requests(recipient_id, status, created_at desc);

create index if not exists idx_message_requests_requester
  on public.message_requests(requester_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Blocks & reports
-- ---------------------------------------------------------------------------
create table if not exists public.message_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  constraint message_blocks_no_self check (blocker_id <> blocked_id),
  constraint message_blocks_unique unique (blocker_id, blocked_id)
);

create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  reason_code text not null,
  detail text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  constraint message_reports_reason_check check (
    reason_code in (
      'spam', 'harassment', 'profanity', 'sexual_harassment', 'scam',
      'off_platform', 'privacy', 'other'
    )
  ),
  constraint message_reports_status_check check (
    status in ('open', 'reviewing', 'resolved', 'dismissed')
  )
);

create index if not exists idx_message_reports_status
  on public.message_reports(status, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_conversation_participant(
  p_conversation_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = p_user_id
  );
$$;

create or replace function public.is_message_blocked(
  p_user_a uuid,
  p_user_b uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.message_blocks mb
    where (mb.blocker_id = p_user_a and mb.blocked_id = p_user_b)
       or (mb.blocker_id = p_user_b and mb.blocked_id = p_user_a)
  );
$$;

grant execute on function public.is_conversation_participant(uuid, uuid) to authenticated;
grant execute on function public.is_message_blocked(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.message_privacy_settings enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_requests enable row level security;
alter table public.message_blocks enable row level security;
alter table public.message_reports enable row level security;

-- Privacy settings
create policy "Users manage own message privacy"
  on public.message_privacy_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Authenticated read message privacy flags"
  on public.message_privacy_settings for select
  to authenticated
  using (true);

-- Conversations
create policy "Participants read conversations"
  on public.conversations for select
  to authenticated
  using (public.is_conversation_participant(id, auth.uid()));

create policy "Authenticated insert conversations"
  on public.conversations for insert
  to authenticated
  with check (true);

create policy "Participants update conversations"
  on public.conversations for update
  to authenticated
  using (public.is_conversation_participant(id, auth.uid()))
  with check (public.is_conversation_participant(id, auth.uid()));

-- Participants
create policy "Participants read conversation participants"
  on public.conversation_participants for select
  to authenticated
  using (public.is_conversation_participant(conversation_id, auth.uid()));

create policy "Users insert self as participant"
  on public.conversation_participants for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Participants update own participant row"
  on public.conversation_participants for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Messages
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
    and deleted_at is null
  );

create policy "Participants send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id, auth.uid())
  );

create policy "Staff read all messages for moderation"
  on public.messages for select
  to authenticated
  using (public.user_has_permission(auth.uid(), 'report.review'));

-- Message requests
create policy "Request parties read message requests"
  on public.message_requests for select
  to authenticated
  using (auth.uid() in (requester_id, recipient_id));

create policy "Requester creates message requests"
  on public.message_requests for insert
  to authenticated
  with check (
    auth.uid() = requester_id
    and not public.is_message_blocked(requester_id, recipient_id)
  );

create policy "Recipient updates message requests"
  on public.message_requests for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- Blocks
create policy "Users read own blocks"
  on public.message_blocks for select
  to authenticated
  using (auth.uid() = blocker_id);

create policy "Users create own blocks"
  on public.message_blocks for insert
  to authenticated
  with check (auth.uid() = blocker_id);

-- Reports
create policy "Users create message reports"
  on public.message_reports for insert
  to authenticated
  with check (
    auth.uid() = reporter_id
    and public.is_conversation_participant(conversation_id, auth.uid())
  );

create policy "Users read own message reports"
  on public.message_reports for select
  to authenticated
  using (
    auth.uid() = reporter_id
    or public.user_has_permission(auth.uid(), 'report.review')
  );

create policy "Staff update message reports"
  on public.message_reports for update
  to authenticated
  using (public.user_has_permission(auth.uid(), 'report.review'))
  with check (public.user_has_permission(auth.uid(), 'report.review'));

-- Default privacy row on profile create (backfill existing)
insert into public.message_privacy_settings (user_id)
select p.id from public.profiles p
where not exists (
  select 1 from public.message_privacy_settings mps where mps.user_id = p.id
)
on conflict (user_id) do nothing;
