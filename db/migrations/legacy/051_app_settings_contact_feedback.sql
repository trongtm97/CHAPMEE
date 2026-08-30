-- Migration 051: App settings (contact) + user feedback messages

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_settings_is_public
  on public.app_settings(is_public);

create or replace function public.touch_app_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_app_settings_updated_at on public.app_settings;
create trigger trg_touch_app_settings_updated_at
before update on public.app_settings
for each row
execute function public.touch_app_settings_updated_at();

alter table public.app_settings enable row level security;

drop policy if exists "Public can read public app settings" on public.app_settings;
create policy "Public can read public app settings"
  on public.app_settings for select
  using (is_public = true or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin founder can insert app settings" on public.app_settings;
create policy "Admin founder can insert app settings"
  on public.app_settings for insert
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin founder can update app settings" on public.app_settings;
create policy "Admin founder can update app settings"
  on public.app_settings for update
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin founder can delete app settings" on public.app_settings;
create policy "Admin founder can delete app settings"
  on public.app_settings for delete
  using (public.is_admin_or_founder(auth.uid()));

insert into public.app_settings (key, value, is_public)
values (
  'contact_settings',
  '{
    "support_email": "",
    "enable_support_email": false,
    "facebook_url": "",
    "enable_facebook": false,
    "telegram_url": "",
    "enable_telegram": false,
    "enable_feedback_form": true,
    "contact_title": "Liên hệ & Góp ý",
    "contact_description": "Báo lỗi, góp ý hoặc liên hệ với ChapChap."
  }'::jsonb,
  true
)
on conflict (key) do nothing;

create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  category text not null check (category in ('feedback', 'bug', 'feature')),
  message text not null check (char_length(trim(message)) >= 10),
  contact_email text,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_messages_created_at
  on public.feedback_messages(created_at desc);

create index if not exists idx_feedback_messages_user_id
  on public.feedback_messages(user_id);

alter table public.feedback_messages enable row level security;

drop policy if exists "Users can insert own feedback" on public.feedback_messages;
create policy "Users can insert own feedback"
  on public.feedback_messages for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Admin founder can read feedback" on public.feedback_messages;
create policy "Admin founder can read feedback"
  on public.feedback_messages for select
  using (public.is_admin_or_founder(auth.uid()));
