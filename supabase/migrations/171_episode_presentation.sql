-- Chapter presentation: structured content + per-chapter mode override

alter table public.episodes
  add column if not exists presentation_mode text,
  add column if not exists structured_content jsonb,
  add column if not exists content_format text;

comment on column public.episodes.presentation_mode is
  'Optional override of story presentation mode for this chapter.';

comment on column public.episodes.structured_content is
  'Structured JSON for chat_story, case_file, diary, system_game, etc.';

comment on column public.episodes.content_format is
  'plain_text | markdown | rich_text | structured_json';

alter table public.episodes
  drop constraint if exists episodes_presentation_mode_check;

alter table public.episodes
  add constraint episodes_presentation_mode_check check (
    presentation_mode is null
    or presentation_mode in (
      'standard_prose',
      'chat_story',
      'social_feed',
      'case_file',
      'diary',
      'system_game',
      'script',
      'mixed_media'
    )
  );

alter table public.episodes
  drop constraint if exists episodes_content_format_check;

alter table public.episodes
  add constraint episodes_content_format_check check (
    content_format is null
    or content_format in ('plain_text', 'markdown', 'rich_text', 'structured_json')
  );

create index if not exists idx_episodes_presentation_mode
  on public.episodes (presentation_mode)
  where presentation_mode is not null;

-- Default format templates with example JSON
insert into public.story_format_templates (
  mode,
  name,
  description,
  is_default,
  sort_order,
  is_active,
  example_json
)
select
  v.mode,
  v.name,
  v.description,
  v.is_default,
  v.sort_order,
  true,
  v.example_json::jsonb
from (
  values
  (
    'chat_story',
    'Chat story mẫu',
    'Hai nhân vật, vài tin nhắn mở đầu.',
    true,
    1,
    '{"characters":[{"id":"a","name":"Lan","avatar_url":null,"side":"left"},{"id":"b","name":"Minh","avatar_url":null,"side":"right"}],"messages":[{"type":"message","character_id":"a","text":"Cậu còn thức không?","time":"00:03"},{"type":"system","text":"Minh đang nhập..."},{"type":"message","character_id":"b","text":"Có chuyện gì vậy?","time":"00:04"}]}'
  ),
  (
    'case_file',
    'Hồ sơ vụ án mẫu',
    'Tóm tắt, timeline, bằng chứng.',
    true,
    1,
    '{"case_title":"Hồ sơ số 17","case_code":"CF-017","status":"Đang điều tra","sections":[{"type":"summary","title":"Tóm tắt vụ án","content":"Một vụ việc hư cấu trong tòa nhà cũ."},{"type":"timeline","title":"Dòng thời gian","items":[{"time":"22:10","content":"Nạn nhân rời khỏi quán."}]},{"type":"evidence","title":"Bằng chứng","items":[{"label":"Bằng chứng A","content":"Một chiếc chìa khóa gãy."}]}]}'
  ),
  (
    'diary',
    'Nhật ký mẫu',
    'Một entry nhật ký.',
    true,
    1,
    '{"entries":[{"date":"2026-05-31","location":"Sài Gòn","mood":"Mưa nhẹ","title":"Ngày đầu tiên","content":"Hôm nay trời mưa nhẹ. Tôi viết những dòng đầu tiên..."}]}'
  ),
  (
    'system_game',
    'System game mẫu',
    'Thông báo hệ thống + stats + đoạn văn.',
    true,
    1,
    '{"blocks":[{"type":"system_notice","title":"Nhiệm vụ mới","content":"Sống sót qua đêm đầu tiên."},{"type":"stats","title":"Trạng thái","items":[{"label":"Cấp","value":"3"},{"label":"HP","value":"80/100"}]},{"type":"prose","content":"Tôi nhìn màn hình xanh hiện ra trước mắt..."}]}'
  )
) as v(mode, name, description, is_default, sort_order, example_json)
on conflict (mode, name) do update set
  description = excluded.description,
  example_json = excluded.example_json,
  is_default = excluded.is_default,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
