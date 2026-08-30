-- ChapMee Studio Composer: admin-configurable modes, blocks, validation limits

create table if not exists public.composer_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

comment on table public.composer_settings is
  'Key-value Composer admin config: validation, modes, block_types.';

create trigger composer_settings_set_updated_at
before update on public.composer_settings
for each row execute function public.set_updated_at();

alter table public.composer_settings enable row level security;

drop policy if exists "Public read composer settings" on public.composer_settings;
create policy "Public read composer settings"
  on public.composer_settings for select
  using (true);

drop policy if exists "Admin manage composer settings" on public.composer_settings;
create policy "Admin manage composer settings"
  on public.composer_settings for all
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
    or public.user_has_permission(auth.uid(), 'taxonomy.templates.manage')
  )
  with check (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
    or public.user_has_permission(auth.uid(), 'taxonomy.templates.manage')
  );

-- Seed defaults (idempotent)
insert into public.composer_settings (key, value)
values
  (
    'validation',
    '{
      "require_publishing_check": true,
      "require_preview_before_publish": false,
      "max_blocks_per_chapter": 500,
      "max_timeline_items": 50,
      "max_stats_items": 50,
      "max_evidence_items": 50,
      "allow_branching_public": false,
      "allow_mixed_media": true,
      "allow_voice_note_audio_upload": false,
      "allow_video_block": false,
      "branching_missing_options_is_error": false
    }'::jsonb
  ),
  (
    'modes',
    '[
      {"mode":"standard_prose","label":"Văn xuôi","description":"Đoạn văn, tiêu đề, ảnh","is_active":true,"is_creator_selectable":true,"sort_order":0},
      {"mode":"chat_story","label":"Chat story","description":"Tin nhắn chat","is_active":true,"is_creator_selectable":true,"sort_order":1},
      {"mode":"social_feed","label":"Social feed","description":"Bài đăng mạng xã hội","is_active":true,"is_creator_selectable":true,"sort_order":2},
      {"mode":"case_file","label":"Hồ sơ vụ án","description":"Hồ sơ điều tra","is_active":true,"is_creator_selectable":true,"sort_order":3},
      {"mode":"diary","label":"Nhật ký","description":"Nhật ký nhân vật","is_active":true,"is_creator_selectable":true,"sort_order":4},
      {"mode":"system_game","label":"Hệ thống / game","description":"LitRPG, thông báo hệ thống","is_active":true,"is_creator_selectable":true,"sort_order":5},
      {"mode":"script","label":"Kịch bản","description":"Thoại và hành động","is_active":true,"is_creator_selectable":true,"sort_order":6},
      {"mode":"mixed_media","label":"Hỗn hợp","description":"Kết hợp nhiều block","is_active":true,"is_creator_selectable":true,"sort_order":7},
      {"mode":"branching_story","label":"Truyện nhánh","description":"Lựa chọn nhánh (beta)","is_active":true,"is_creator_selectable":false,"sort_order":8}
    ]'::jsonb
  ),
  (
    'block_types',
    '[]'::jsonb
  )
on conflict (key) do nothing;
