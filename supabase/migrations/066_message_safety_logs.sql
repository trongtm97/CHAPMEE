-- Log sự kiện lọc tin nhắn (preview ngắn, không lưu full text nhạy cảm)

create table if not exists public.message_safety_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_request_id uuid references public.message_requests(id) on delete set null,
  text_preview text not null,
  status text not null,
  reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint message_safety_logs_status_check check (
    status in ('warning', 'blocked', 'review')
  )
);

create index if not exists idx_message_safety_logs_user_created
  on public.message_safety_logs(user_id, created_at desc);

alter table public.message_safety_logs enable row level security;

create policy "Users insert own safety logs"
  on public.message_safety_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Staff read safety logs"
  on public.message_safety_logs for select
  to authenticated
  using (public.user_has_permission(auth.uid(), 'report.review'));
