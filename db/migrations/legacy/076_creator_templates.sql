-- ChapMee Studio content templates (Mẫu nội dung)

create table public.creator_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  template_type text not null,
  title text not null,
  description text,
  content jsonb not null default '{}'::jsonb,
  plain_text text,
  is_system boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_templates_type_check check (
    template_type in (
      'story_description',
      'chapter',
      'author_note',
      'swipe',
      'seo',
      'community_post'
    )
  ),
  constraint creator_templates_status_check check (status in ('active', 'archived')),
  constraint creator_templates_system_owner_check check (
    (is_system = true and owner_id is null)
    or (is_system = false and owner_id is not null)
  )
);

create index creator_templates_owner_idx
  on public.creator_templates (owner_id, updated_at desc);

create index creator_templates_system_idx
  on public.creator_templates (template_type, status)
  where is_system = true;

create trigger creator_templates_set_updated_at
before update on public.creator_templates
for each row execute function public.set_updated_at();

alter table public.creator_templates enable row level security;

create policy "Read active system templates"
on public.creator_templates
for select
to authenticated
using (is_system = true and status = 'active');

create policy "Owners read own templates"
on public.creator_templates
for select
to authenticated
using (owner_id = auth.uid());

create policy "Owners insert own templates"
on public.creator_templates
for insert
to authenticated
with check (owner_id = auth.uid() and is_system = false);

create policy "Owners update own templates"
on public.creator_templates
for update
to authenticated
using (owner_id = auth.uid() and is_system = false)
with check (owner_id = auth.uid() and is_system = false);

create policy "Owners delete own templates"
on public.creator_templates
for delete
to authenticated
using (owner_id = auth.uid() and is_system = false);

create policy "Staff manage system templates"
on public.creator_templates
for all
to authenticated
using (
  is_system = true
  and public.current_profile_role() in ('admin', 'moderator')
)
with check (
  is_system = true
  and public.current_profile_role() in ('admin', 'moderator')
);

-- Mẫu hệ thống ChapMee
insert into public.creator_templates (
  id,
  owner_id,
  template_type,
  title,
  description,
  content,
  plain_text,
  is_system,
  status
)
values
  (
    'a1000001-0001-4001-8001-000000000001',
    null,
    'chapter',
    'Mở đầu chương — recap ngắn',
    'Tóm tắt chương trước và mở tình huống mới.',
    '{"body":"**Tóm tắt nhanh chương trước:**\n...\n\n**Ở chương này:**\n...\n\n---\n\n","format":"plain"}'::jsonb,
    'Tóm tắt nhanh chương trước... Ở chương này...',
    true,
    'active'
  ),
  (
    'a1000001-0001-4001-8001-000000000002',
    null,
    'author_note',
    'Ghi chú — cảm ơn & theo dõi',
    'Cảm ơn người đọc và kêu gọi lưu/theo dõi truyện.',
    '{"body":"Cảm ơn bạn đã đọc chương này.\n\nNếu thích truyện, hãy **lưu truyện** và **theo dõi** để nhận chương mới sớm nhất.\n\nGặp lại bạn ở chương sau!","format":"plain"}'::jsonb,
    'Cảm ơn bạn đã đọc chương này. Nếu thích truyện, hãy lưu truyện và theo dõi...',
    true,
    'active'
  ),
  (
    'a1000001-0001-4001-8001-000000000003',
    null,
    'chapter',
    'Cảnh báo nội dung nhẹ',
    'Đặt trước chương khi có nội dung nhạy cảm.',
    '{"body":"> **Lưu ý nội dung:** Chương có thể chứa [mô tả ngắn: bạo lực / tâm lý / ...]. Bạn có thể bỏ qua nếu cảm thấy không phù hợp.\n\n---\n\n","format":"plain"}'::jsonb,
    'Lưu ý nội dung: Chương có thể chứa...',
    true,
    'active'
  ),
  (
    'a1000001-0001-4001-8001-000000000004',
    null,
    'chapter',
    'Truyện chat — khung hội thoại',
    'Định dạng hội thoại tên nhân vật + thoại.',
    '{"body":"**Tên nhân vật A:**\nNội dung tin nhắn...\n\n**Tên nhân vật B:**\nNội dung trả lời...\n\n**Tên nhân vật A:**\n...\n\n","format":"plain"}'::jsonb,
    'Tên nhân vật A: Nội dung tin nhắn...',
    true,
    'active'
  ),
  (
    'a1000001-0001-4001-8001-000000000005',
    null,
    'swipe',
    'Swipe — hook & CTA ngắn',
    'Hook mạnh + đoạn ngắn + kêu gọi hành động.',
    '{"body":"**Hook (1–2 câu):**\n...\n\n**Đoạn chính:**\n...\n\n**CTA:** Vuốt / đọc tiếp / theo dõi tác giả.\n","format":"plain"}'::jsonb,
    'Hook... Đoạn chính... CTA...',
    true,
    'active'
  ),
  (
    'a1000001-0001-4001-8001-000000000006',
    null,
    'story_description',
    'Mô tả truyện — hook ngắn',
    'Mở đầu mô tả truyện trên trang chi tiết.',
    '{"body":"**Hook:**\nMột câu gây tò mò về truyện.\n\n**Nội dung:**\nGiới thiệu bối cảnh, nhân vật chính và xung đột cốt lõi (3–5 câu).\n","format":"plain"}'::jsonb,
    'Hook... Nội dung...',
    true,
    'active'
  )
on conflict (id) do nothing;
