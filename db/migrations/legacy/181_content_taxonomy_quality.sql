-- Content Taxonomy Quality: flags, rules, creator revision requests

create table if not exists public.content_taxonomy_quality_flags (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  flag_type text not null,
  severity text not null default 'medium',
  status text not null default 'open',
  reason text not null,
  details_json jsonb not null default '{}'::jsonb,
  detected_by text not null default 'system',
  created_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_taxonomy_quality_flags_type_check check (
    flag_type in (
      'missing_required',
      'too_many_tags',
      'hot_tag_abuse',
      'conflicting_taxonomy',
      'missing_warning',
      'user_reported_wrong_tag',
      'import_error',
      'admin_manual'
    )
  ),
  constraint content_taxonomy_quality_flags_severity_check check (
    severity in ('low', 'medium', 'high', 'critical')
  ),
  constraint content_taxonomy_quality_flags_status_check check (
    status in ('open', 'reviewing', 'resolved', 'dismissed', 'sent_to_creator')
  ),
  constraint content_taxonomy_quality_flags_detected_by_check check (
    detected_by in ('system', 'admin', 'user_report', 'import')
  )
);

create index if not exists idx_ctq_flags_story_status
  on public.content_taxonomy_quality_flags(story_id, status, created_at desc);

create index if not exists idx_ctq_flags_type_status
  on public.content_taxonomy_quality_flags(flag_type, status, severity, created_at desc);

create index if not exists idx_ctq_flags_open
  on public.content_taxonomy_quality_flags(created_at desc)
  where status in ('open', 'reviewing', 'sent_to_creator');

create trigger content_taxonomy_quality_flags_set_updated_at
before update on public.content_taxonomy_quality_flags
for each row execute function public.touch_updated_at();

create table if not exists public.taxonomy_quality_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  name text not null,
  description text,
  is_enabled boolean not null default true,
  severity text not null default 'medium',
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint taxonomy_quality_rules_severity_check check (
    severity in ('low', 'medium', 'high', 'critical')
  )
);

create trigger taxonomy_quality_rules_set_updated_at
before update on public.taxonomy_quality_rules
for each row execute function public.touch_updated_at();

create table if not exists public.creator_taxonomy_revision_requests (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  required_changes_json jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  due_at timestamptz,
  creator_note text,
  creator_submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_taxonomy_revision_requests_status_check check (
    status in ('open', 'creator_submitted', 'approved', 'rejected', 'cancelled')
  )
);

create index if not exists idx_creator_taxonomy_revision_creator_status
  on public.creator_taxonomy_revision_requests(creator_id, status, created_at desc);

create index if not exists idx_creator_taxonomy_revision_story
  on public.creator_taxonomy_revision_requests(story_id, status);

create trigger creator_taxonomy_revision_requests_set_updated_at
before update on public.creator_taxonomy_revision_requests
for each row execute function public.touch_updated_at();

-- Default rules
insert into public.taxonomy_quality_rules (rule_key, name, description, severity, config_json)
values
  (
    'missing_required',
    'Thiếu phân loại bắt buộc',
    'Thiếu content_type, main_genre, age_rating, presentation_mode hoặc chưa xác nhận cảnh báo.',
    'high',
    '{"required_types":["content_type","main_genre","age_rating","presentation_mode"],"require_warnings_confirmation":true}'::jsonb
  ),
  (
    'too_many_tags',
    'Quá nhiều tag',
    'Vượt giới hạn số tag theo loại taxonomy.',
    'medium',
    '{"max_subgenre":3,"max_trope_tag":12,"max_setting_tag":5,"max_character_tag":5,"max_relationship_tag":3,"max_reader_experience":5}'::jsonb
  ),
  (
    'hot_tag_abuse',
    'Lạm dụng tag nổi bật',
    'Quá nhiều tag featured hoặc tag hot bị report sai tag.',
    'medium',
    '{"max_featured_tags":5,"report_threshold_wrong_tag":3}'::jsonb
  ),
  (
    'conflicting_taxonomy',
    'Phân loại mâu thuẫn',
    'Age rating, content warning, presentation mode hoặc trạng thái không nhất quán.',
    'high',
    '{"all_ages_slugs":["all_ages"],"severe_warning_slugs":["bao-luc-nang","tu-hai-tu-tu","lam-dung","cuong-ep-khong-dong-thuan","noi-dung-nguoi-lon","tinh-duc-ro-rang"],"children_genre_slugs":["thieu-nhi"],"poetry_content_type_slugs":["tho"],"system_game_presentation_slugs":["system_game"],"romance_relationship_slugs":["romance-chinh","tinh-cam-chinh"]}'::jsonb
  ),
  (
    'missing_warning',
    'Thiếu cảnh báo nội dung',
    'Chưa khai báo cảnh báo nhưng có report hoặc moderator flag.',
    'high',
    '{"report_threshold":3}'::jsonb
  ),
  (
    'user_reported_wrong_tag',
    'Report sai tag từ độc giả',
    'Tạo flag khi report taxonomy vượt ngưỡng.',
    'medium',
    '{"report_threshold":3,"report_reasons":["wrong_taxonomy_tag","missing_content_warning","wrong_age_rating"]}'::jsonb
  ),
  (
    'import_error',
    'Lỗi import taxonomy',
    'Phát hiện batch import có nhiều slug không hợp lệ hoặc thiếu field.',
    'medium',
    '{"invalid_slug_threshold":5,"missing_required_threshold":10}'::jsonb
  ),
  (
    'taxonomy_behavior_mismatch',
    'Hành vi đọc không khớp phân loại',
    'Placeholder — cần analytics bounce/retention theo taxonomy page.',
    'low',
    '{"bounce_threshold":0.85,"enabled":false}'::jsonb
  )
on conflict (rule_key) do nothing;

-- Permissions
insert into public.permissions (code, name, group_key)
values
  ('content_taxonomy_quality.view', 'View content taxonomy quality', 'moderation'),
  ('content_taxonomy_quality.review', 'Review taxonomy quality flags', 'moderation'),
  ('content_taxonomy_quality.edit_story_taxonomy', 'Edit story taxonomy from quality panel', 'moderation'),
  ('content_taxonomy_quality.request_creator_revision', 'Request creator taxonomy revision', 'moderation'),
  ('content_taxonomy_quality.manage_rules', 'Manage taxonomy quality rules', 'moderation')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code in (
  'content_taxonomy_quality.view',
  'content_taxonomy_quality.review',
  'content_taxonomy_quality.edit_story_taxonomy',
  'content_taxonomy_quality.request_creator_revision',
  'content_taxonomy_quality.manage_rules'
)
where r.code in ('admin', 'content_admin', 'super_admin', 'owner', 'moderator')
on conflict do nothing;

-- RLS
alter table public.content_taxonomy_quality_flags enable row level security;
alter table public.taxonomy_quality_rules enable row level security;
alter table public.creator_taxonomy_revision_requests enable row level security;

drop policy if exists "Staff manage taxonomy quality flags" on public.content_taxonomy_quality_flags;
create policy "Staff manage taxonomy quality flags"
  on public.content_taxonomy_quality_flags for all
  using (public.user_has_permission(auth.uid(), 'content_taxonomy_quality.view'))
  with check (public.user_has_permission(auth.uid(), 'content_taxonomy_quality.review'));

drop policy if exists "Creators read own taxonomy revision requests" on public.creator_taxonomy_revision_requests;
create policy "Creators read own taxonomy revision requests"
  on public.creator_taxonomy_revision_requests for select
  using (creator_id = auth.uid());

drop policy if exists "Creators update own taxonomy revision requests" on public.creator_taxonomy_revision_requests;
create policy "Creators update own taxonomy revision requests"
  on public.creator_taxonomy_revision_requests for update
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

drop policy if exists "Staff manage taxonomy revision requests" on public.creator_taxonomy_revision_requests;
create policy "Staff manage taxonomy revision requests"
  on public.creator_taxonomy_revision_requests for all
  using (public.user_has_permission(auth.uid(), 'content_taxonomy_quality.view'))
  with check (public.user_has_permission(auth.uid(), 'content_taxonomy_quality.request_creator_revision'));

drop policy if exists "Staff read taxonomy quality rules" on public.taxonomy_quality_rules;
create policy "Staff read taxonomy quality rules"
  on public.taxonomy_quality_rules for select
  using (public.user_has_permission(auth.uid(), 'content_taxonomy_quality.view'));

drop policy if exists "Staff manage taxonomy quality rules" on public.taxonomy_quality_rules;
create policy "Staff manage taxonomy quality rules"
  on public.taxonomy_quality_rules for update
  using (public.user_has_permission(auth.uid(), 'content_taxonomy_quality.manage_rules'))
  with check (public.user_has_permission(auth.uid(), 'content_taxonomy_quality.manage_rules'));
