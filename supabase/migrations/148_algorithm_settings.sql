-- Admin-configurable algorithm weights & fairness parameters.

create table if not exists public.algorithm_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  value_type text not null,
  category text not null,
  label text not null,
  description text,
  min_value numeric,
  max_value numeric,
  default_value jsonb,
  is_active boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint algorithm_settings_value_type_check check (
    value_type in ('number', 'boolean', 'string', 'json', 'percentage')
  ),
  constraint algorithm_settings_category_check check (
    category in (
      'reels', 'discover', 'search', 'ranking', 'cold_start', 'fairness',
      'safety', 'spam', 'monetization', 'system'
    )
  )
);

create index if not exists algorithm_settings_category_idx
  on public.algorithm_settings (category, is_active);

create index if not exists algorithm_settings_updated_at_idx
  on public.algorithm_settings (updated_at desc);

create trigger algorithm_settings_set_updated_at
before update on public.algorithm_settings
for each row execute function public.set_updated_at();

create table if not exists public.algorithm_setting_audit_logs (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists algorithm_setting_audit_logs_key_created_idx
  on public.algorithm_setting_audit_logs (setting_key, created_at desc);

create index if not exists algorithm_setting_audit_logs_created_idx
  on public.algorithm_setting_audit_logs (created_at desc);

alter table public.algorithm_settings enable row level security;
alter table public.algorithm_setting_audit_logs enable row level security;

create policy "Algorithm settings readable by settings viewers"
  on public.algorithm_settings for select
  to authenticated
  using (
    public.can_manage_app_settings(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
    or public.current_profile_role() in ('admin', 'moderator')
  );

create policy "Algorithm settings writable by settings managers"
  on public.algorithm_settings for update
  to authenticated
  using (
    public.can_manage_app_settings(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  )
  with check (
    public.can_manage_app_settings(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

create policy "Algorithm settings insert by settings managers"
  on public.algorithm_settings for insert
  to authenticated
  with check (
    public.can_manage_app_settings(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

create policy "Algorithm audit logs readable by settings viewers"
  on public.algorithm_setting_audit_logs for select
  to authenticated
  using (
    public.can_manage_app_settings(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
    or public.current_profile_role() in ('admin', 'moderator')
  );

create policy "Algorithm audit logs insert by settings managers"
  on public.algorithm_setting_audit_logs for insert
  to authenticated
  with check (
    public.can_manage_app_settings(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

-- Seed defaults (idempotent)
insert into public.algorithm_settings (key, value, value_type, category, label, description, min_value, max_value, default_value)
values
  ('system.algorithm_version', '"1.0.0"'::jsonb, 'string', 'system', 'Phiên bản cấu hình', 'Nhãn version cho audit và cache bust.', null, null, '"1.0.0"'::jsonb),

  ('reels.weight.personalized', '0.40'::jsonb, 'number', 'reels', 'Trọng số cá nhân hóa', 'Tỷ trọng reel feed theo sở thích người dùng.', 0, 1, '0.40'::jsonb),
  ('reels.weight.trending_quality', '0.20'::jsonb, 'number', 'reels', 'Trọng số trending chất lượng', null, 0, 1, '0.20'::jsonb),
  ('reels.weight.new_under_exposed', '0.20'::jsonb, 'number', 'reels', 'Trọng số nội dung mới / ít exposure', null, 0, 1, '0.20'::jsonb),
  ('reels.weight.followed_author', '0.10'::jsonb, 'number', 'reels', 'Trọng số tác giả đang theo dõi', null, 0, 1, '0.10'::jsonb),
  ('reels.weight.long_tail_quality', '0.10'::jsonb, 'number', 'reels', 'Trọng số long-tail chất lượng', null, 0, 1, '0.10'::jsonb),
  ('reels.max_same_author_in_20', '2'::jsonb, 'number', 'reels', 'Tối đa reel cùng tác giả / 20 slot', 'Giới hạn độc quyền tác giả trong một batch.', 1, 20, '2'::jsonb),
  ('reels.max_same_story_in_30', '3'::jsonb, 'number', 'reels', 'Tối đa reel cùng truyện / 30 slot', null, 1, 30, '3'::jsonb),
  ('reels.min_new_author_slots_percent', '15'::jsonb, 'percentage', 'reels', '% slot tác giả mới tối thiểu', null, 0, 100, '15'::jsonb),
  ('reels.min_under_exposed_slots_percent', '15'::jsonb, 'percentage', 'reels', '% slot under-exposed tối thiểu', null, 0, 100, '15'::jsonb),

  ('discover.weight.personalized', '0.25'::jsonb, 'number', 'discover', 'Trọng số cá nhân hóa', null, 0, 1, '0.25'::jsonb),
  ('discover.weight.fresh', '0.20'::jsonb, 'number', 'discover', 'Trọng số nội dung mới', null, 0, 1, '0.20'::jsonb),
  ('discover.weight.growing', '0.20'::jsonb, 'number', 'discover', 'Trọng số đang tăng trưởng', null, 0, 1, '0.20'::jsonb),
  ('discover.weight.completed_story', '0.15'::jsonb, 'number', 'discover', 'Trọng số truyện hoàn thành', null, 0, 1, '0.15'::jsonb),
  ('discover.weight.new_author', '0.10'::jsonb, 'number', 'discover', 'Trọng số tác giả mới', null, 0, 1, '0.10'::jsonb),
  ('discover.weight.long_tail', '0.10'::jsonb, 'number', 'discover', 'Trọng số long-tail', null, 0, 1, '0.10'::jsonb),

  ('ranking.weight.completion_rate', '0.30'::jsonb, 'number', 'ranking', 'Trọng số tỷ lệ hoàn thành chương', null, 0, 1, '0.30'::jsonb),
  ('ranking.weight.next_chapter_rate', '0.25'::jsonb, 'number', 'ranking', 'Trọng số chuyển chương tiếp', null, 0, 1, '0.25'::jsonb),
  ('ranking.weight.save_rate', '0.15'::jsonb, 'number', 'ranking', 'Trọng số lưu truyện', null, 0, 1, '0.15'::jsonb),
  ('ranking.weight.follow_rate', '0.10'::jsonb, 'number', 'ranking', 'Trọng số theo dõi', null, 0, 1, '0.10'::jsonb),
  ('ranking.weight.unlock_rate', '0.10'::jsonb, 'number', 'ranking', 'Trọng số mở khóa trả phí', null, 0, 1, '0.10'::jsonb),
  ('ranking.weight.freshness', '0.05'::jsonb, 'number', 'ranking', 'Trọng số độ mới', null, 0, 1, '0.05'::jsonb),
  ('ranking.weight.fairness', '0.05'::jsonb, 'number', 'ranking', 'Trọng số công bằng hiển thị', null, 0, 1, '0.05'::jsonb),
  ('ranking.report_penalty_weight', '0.30'::jsonb, 'number', 'ranking', 'Hệ số phạt báo cáo', 'Không nằm trong nhóm weight = 1.', 0, 1, '0.30'::jsonb),
  ('ranking.hide_penalty_weight', '0.20'::jsonb, 'number', 'ranking', 'Hệ số phạt ẩn', null, 0, 1, '0.20'::jsonb),

  ('search.weight.text_relevance', '0.45'::jsonb, 'number', 'search', 'Trọng số khớp văn bản', null, 0, 1, '0.45'::jsonb),
  ('search.weight.quality', '0.20'::jsonb, 'number', 'search', 'Trọng số chất lượng', null, 0, 1, '0.20'::jsonb),
  ('search.weight.exact_match', '0.15'::jsonb, 'number', 'search', 'Trọng số khớp chính xác', null, 0, 1, '0.15'::jsonb),
  ('search.weight.freshness', '0.10'::jsonb, 'number', 'search', 'Trọng số độ mới', null, 0, 1, '0.10'::jsonb),
  ('search.weight.fairness', '0.10'::jsonb, 'number', 'search', 'Trọng số công bằng', null, 0, 1, '0.10'::jsonb),
  ('search.max_same_author_top_results', '3'::jsonb, 'number', 'search', 'Tối đa kết quả cùng tác giả (top)', null, 1, 20, '3'::jsonb),

  ('cold_start.new_story_initial_impressions', '500'::jsonb, 'number', 'cold_start', 'Impression khởi tạo truyện mới', null, 0, 100000, '500'::jsonb),
  ('cold_start.new_reel_initial_impressions', '1000'::jsonb, 'number', 'cold_start', 'Impression khởi tạo reel mới', null, 0, 100000, '1000'::jsonb),
  ('cold_start.new_author_daily_min_impressions', '200'::jsonb, 'number', 'cold_start', 'Impression tối thiểu / ngày (tác giả mới)', null, 0, 100000, '200'::jsonb),
  ('cold_start.min_test_window_hours', '24'::jsonb, 'number', 'cold_start', 'Cửa sổ test tối thiểu (giờ)', null, 1, 168, '24'::jsonb),
  ('cold_start.max_test_window_hours', '72'::jsonb, 'number', 'cold_start', 'Cửa sổ test tối đa (giờ)', null, 1, 336, '72'::jsonb),

  ('fairness.author_exposure_cap_7d_percent', '10'::jsonb, 'percentage', 'fairness', 'Cap exposure tác giả (7 ngày, %)', null, 1, 100, '10'::jsonb),
  ('fairness.story_exposure_cap_7d_percent', '8'::jsonb, 'percentage', 'fairness', 'Cap exposure truyện (7 ngày, %)', null, 1, 100, '8'::jsonb),
  ('fairness.author_over_cap_penalty', '0.20'::jsonb, 'number', 'fairness', 'Phạt vượt cap tác giả', null, 0, 1, '0.20'::jsonb),
  ('fairness.story_over_cap_penalty', '0.20'::jsonb, 'number', 'fairness', 'Phạt vượt cap truyện', null, 0, 1, '0.20'::jsonb),
  ('fairness.long_tail_quality_boost', '0.25'::jsonb, 'number', 'fairness', 'Boost long-tail chất lượng', null, 0, 1, '0.25'::jsonb),
  ('fairness.under_exposed_boost', '0.20'::jsonb, 'number', 'fairness', 'Boost under-exposed', null, 0, 1, '0.20'::jsonb),
  ('fairness.min_long_tail_slots_percent', '10'::jsonb, 'percentage', 'fairness', '% slot long-tail tối thiểu', null, 0, 100, '10'::jsonb),

  ('safety.report_rate_threshold', '0.03'::jsonb, 'number', 'safety', 'Ngưỡng tỷ lệ báo cáo', null, 0, 1, '0.03'::jsonb),
  ('safety.hide_rate_threshold', '0.05'::jsonb, 'number', 'safety', 'Ngưỡng tỷ lệ ẩn', null, 0, 1, '0.05'::jsonb),
  ('safety.report_penalty', '0.50'::jsonb, 'number', 'safety', 'Phạt báo cáo', null, 0, 1, '0.50'::jsonb),
  ('safety.hide_penalty', '0.30'::jsonb, 'number', 'safety', 'Phạt ẩn', null, 0, 1, '0.30'::jsonb),
  ('safety.policy_warning_penalty', '0.40'::jsonb, 'number', 'safety', 'Phạt cảnh báo chính sách', null, 0, 1, '0.40'::jsonb),

  ('spam.max_reels_per_author_per_day_for_boost', '5'::jsonb, 'number', 'spam', 'Tối đa reel boost / tác giả / ngày', null, 1, 100, '5'::jsonb),
  ('spam.duplicate_content_penalty', '0.50'::jsonb, 'number', 'spam', 'Phạt nội dung trùng', null, 0, 1, '0.50'::jsonb),
  ('spam.tag_abuse_penalty', '0.30'::jsonb, 'number', 'spam', 'Phạt lạm dụng tag', null, 0, 1, '0.30'::jsonb),
  ('spam.title_mismatch_penalty', '0.30'::jsonb, 'number', 'spam', 'Phạt title không khớp', null, 0, 1, '0.30'::jsonb),
  ('spam.low_quality_author_penalty', '0.20'::jsonb, 'number', 'spam', 'Phạt tác giả chất lượng thấp', null, 0, 1, '0.20'::jsonb)
on conflict (key) do nothing;
