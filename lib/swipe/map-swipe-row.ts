import type { SwipeItemListItem, SwipeItemRecord, SwipeItemStatus, SwipeSourceType } from "@/types/swipe";

type SwipeRow = {
  id: string;
  owner_id: string;
  story_id: string;
  chapter_id: string | null;
  title: string | null;
  hook: string;
  body: string;
  cta: string | null;
  cta_type: string | null;
  background_image_url: string | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  source_type: string | null;
  source_text_start: number | null;
  source_text_end: number | null;
  view_count: number | null;
  cta_click_count: number | null;
  created_at: string;
  updated_at: string;
};

export function mapSwipeRow(row: SwipeRow): SwipeItemRecord {
  return {
    backgroundImageUrl: row.background_image_url,
    body: row.body,
    chapterId: row.chapter_id,
    createdAt: row.created_at,
    cta: row.cta,
    ctaClickCount: row.cta_click_count ?? 0,
    ctaType: row.cta_type,
    hook: row.hook,
    id: row.id,
    ownerId: row.owner_id,
    publishedAt: row.published_at,
    scheduledAt: row.scheduled_at,
    sourceTextEnd: row.source_text_end,
    sourceTextStart: row.source_text_start,
    sourceType: row.source_type as SwipeSourceType | null,
    status: row.status as SwipeItemStatus,
    storyId: row.story_id,
    title: row.title,
    updatedAt: row.updated_at,
    viewCount: row.view_count ?? 0
  };
}

export function mapSwipeListRow(
  row: SwipeRow & {
    stories:
      | { title: string; slug: string }
      | { title: string; slug: string }[]
      | null;
    episodes:
      | { title: string; episode_number: number }
      | { title: string; episode_number: number }[]
      | null;
  }
): SwipeItemListItem {
  const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
  const episode = Array.isArray(row.episodes) ? row.episodes[0] : row.episodes;
  const base = mapSwipeRow(row);

  return {
    ...base,
    chapterNumber: episode?.episode_number ?? null,
    chapterTitle: episode?.title ?? null,
    storySlug: story?.slug ?? "—",
    storyTitle: story?.title ?? "Chưa chọn truyện"
  };
}
