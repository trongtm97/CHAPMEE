create table public.badges (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null,
  type text not null,
  icon text not null default '🏅',
  rarity text not null,
  created_at timestamptz not null default now(),
  constraint badges_type_check check (type in ('reader', 'author', 'general')),
  constraint badges_rarity_check check (rarity in ('common', 'rare', 'epic', 'legendary'))
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  related_story_id uuid references public.stories(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb
);

create unique index user_badges_unique_single_idx
on public.user_badges(user_id, badge_id)
where related_story_id is null;

create unique index user_badges_unique_story_idx
on public.user_badges(user_id, badge_id, related_story_id)
where related_story_id is not null;

create index user_badges_user_id_idx on public.user_badges(user_id);
create index user_badges_badge_id_idx on public.user_badges(badge_id);
create index user_badges_awarded_at_idx on public.user_badges(awarded_at);

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

create policy "Badges are readable"
on public.badges for select
using (true);

create policy "Users can read their badges or public creator badges"
on public.user_badges for select
using (
  auth.uid() = user_id
  or (
    exists (
      select 1
      from public.creator_profiles
      where creator_profiles.user_id = user_badges.user_id
        and creator_profiles.status = 'active'
    )
    and exists (
      select 1
      from public.badges
      where badges.id = user_badges.badge_id
        and badges.type in ('author', 'general')
    )
  )
);

create policy "Users can create own badges"
on public.user_badges for insert
with check (auth.uid() = user_id);

insert into public.badges (key, name, description, type, icon, rarity)
values
  ('reader_new', 'Người đọc mới', 'Tài khoản đọc mới trong tuần đầu trên ChapChap.', 'reader', '✨', 'common'),
  ('early_fan', 'Fan đời đầu', 'Theo dõi truyện khi nó còn rất sớm.', 'reader', '⚡', 'rare'),
  ('story_saver', 'Người lưu truyện', 'Đánh dấu truyện để đọc sau.', 'reader', '🔖', 'common'),
  ('author_follower', 'Người theo dõi tác giả', 'Theo dõi tác giả để không bỏ lỡ chương mới.', 'reader', '👀', 'common'),
  ('active_commenter', 'Bình luận tích cực', 'Đã để lại nhiều bình luận hữu ích cho cộng đồng.', 'reader', '💬', 'rare'),
  ('top_comment_candidate', 'Comment được thích', 'Bình luận bắt đầu nhận được nhiều lượt thích.', 'reader', '🌟', 'epic'),
  ('author_new', 'Tác giả mới', 'Vừa mở hồ sơ tác giả trên ChapChap.', 'author', '✍️', 'common'),
  ('first_story', 'Truyện đầu tiên', 'Đã có ít nhất một truyện public.', 'author', '📚', 'common'),
  ('first_100_reads', '100 lượt đọc đầu tiên', 'Chạm mốc 100 lượt đọc cho tác phẩm.', 'author', '📈', 'rare'),
  ('first_1000_reads', '1.000 lượt đọc', 'Tác phẩm bắt đầu chạm một cột mốc lớn.', 'author', '🔥', 'epic'),
  ('loved_author', 'Tác giả được yêu thích', 'Có nhiều người theo dõi tác giả.', 'author', '❤️', 'rare'),
  ('consistent_writer', 'Viết đều', 'Đăng truyện đều đặn trong một khoảng thời gian ngắn.', 'author', '🗓️', 'legendary')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  type = excluded.type,
  icon = excluded.icon,
  rarity = excluded.rarity;
