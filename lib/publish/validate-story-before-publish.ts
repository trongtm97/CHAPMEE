import {
  createRule,
  formatBlockingErrors,
  isStoryStatusBlockedForPublish,
  summarizeChecklist
} from "@/lib/publish/checklist-utils";
import type { PublishChecklistResult } from "@/types/publish-checklist";
import { STORY_DESCRIPTION_MIN_CHARS } from "@/types/publish-checklist";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StoryPublishInput = {
  title?: string | null;
  hook?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  coverUrl?: string | null;
  genreId?: string | null;
  tagIds?: string[];
  tagCount?: number;
  status?: string | null;
  visibility?: string | null;
  seoDescription?: string | null;
  hasCover?: boolean;
  hasSwipePromo?: boolean;
};

function storyDescriptionText(input: StoryPublishInput) {
  return (
    input.shortDescription?.trim() ||
    input.longDescription?.trim() ||
    input.hook?.trim() ||
    ""
  );
}

export function validateStoryBeforePublish(
  input: StoryPublishInput
): PublishChecklistResult {
  const description = storyDescriptionText(input);
  const tagCount = input.tagIds?.length ?? input.tagCount ?? 0;
  const hasCover = input.hasCover ?? Boolean(input.coverUrl?.trim());
  const blocked = isStoryStatusBlockedForPublish(input.status);

  const rules = [
    createRule({
      blocking: true,
      id: "title",
      label: "Thiếu tiêu đề truyện",
      message: "Thiếu tiêu đề truyện.",
      ok: Boolean(input.title?.trim()),
      targetType: "story"
    }),
    createRule({
      blocking: true,
      id: "description",
      label: "Thiếu mô tả truyện",
      message: "Thiếu mô tả truyện (mô tả ngắn, dài hoặc hook).",
      ok: Boolean(description),
      targetType: "story"
    }),
    createRule({
      blocking: true,
      id: "genre",
      label: "Chưa chọn danh mục",
      message: "Chọn danh mục (thể loại chính) cho truyện.",
      ok: Boolean(input.genreId),
      targetType: "story"
    }),
    createRule({
      blocking: true,
      id: "tags",
      label: "Chưa chọn thể loại",
      message: "Chọn ít nhất một thể loại (tag).",
      ok: tagCount > 0,
      targetType: "story"
    }),
    createRule({
      blocking: true,
      id: "cover",
      label: "Thiếu ảnh bìa",
      message: "Thêm ảnh bìa trước khi đăng truyện public.",
      ok: hasCover,
      targetType: "story"
    }),
    createRule({
      blocking: true,
      id: "status",
      label: "Truyện đang bị chặn đăng",
      message:
        "Truyện đang ở trạng thái không được đăng (từ chối, lưu trữ hoặc chờ duyệt).",
      ok: !blocked,
      targetType: "story"
    }),
    createRule({
      id: "description-length",
      label: "Mô tả quá ngắn",
      message: `Mô tả nên dài hơn ${STORY_DESCRIPTION_MIN_CHARS} ký tự để người đọc hiểu truyện.`,
      ok: description.length >= STORY_DESCRIPTION_MIN_CHARS,
      targetType: "story",
      warnIfFail: true
    }),
    createRule({
      id: "seo",
      label: "Chưa có SEO description",
      message: "Thêm mô tả SEO để trang truyện hiển thị tốt trên công cụ tìm kiếm.",
      ok: Boolean(input.seoDescription?.trim()),
      targetType: "story",
      warnIfFail: true
    }),
    createRule({
      id: "swipe-promo",
      label: "Chưa có Swipe quảng bá",
      message: "Tạo Swipe quảng bá để thu hút độc giả (khuyến nghị).",
      ok: Boolean(input.hasSwipePromo),
      targetType: "story",
      warnIfFail: true
    })
  ];

  return summarizeChecklist(rules);
}

async function storyHasCover(
  supabase: SupabaseClient,
  storyId: string,
  coverUrl: string | null
) {
  if (coverUrl?.trim()) {
    return true;
  }

  const { count } = await supabase
    .from("story_images")
    .select("id", { count: "exact", head: true })
    .eq("story_id", storyId)
    .eq("is_current", true);

  return (count ?? 0) > 0;
}

async function storyHasSwipePromo(supabase: SupabaseClient, storyId: string) {
  const { count } = await supabase
    .from("swipe_items")
    .select("id", { count: "exact", head: true })
    .eq("story_id", storyId)
    .eq("status", "published");

  return (count ?? 0) > 0;
}

export async function validateStoryBeforePublishFromDb(
  supabase: SupabaseClient,
  storyId: string,
  creatorProfileId: string
): Promise<PublishChecklistResult> {
  const { data, error } = await supabase
    .from("stories")
    .select(
      "id, title, hook, short_description, long_description, cover_url, genre_id, status, visibility, seo_description, creator_id"
    )
    .eq("id", storyId)
    .eq("creator_id", creatorProfileId)
    .maybeSingle();

  if (error || !data) {
    return summarizeChecklist([
      createRule({
        blocking: true,
        id: "story",
        label: "Không tìm thấy truyện",
        message: "Không tìm thấy truyện hoặc bạn không có quyền.",
        ok: false,
        targetType: "story"
      })
    ]);
  }

  const [tagCount, hasCover, hasSwipePromo] = await Promise.all([
    supabase
      .from("story_tags")
      .select("tag_id", { count: "exact", head: true })
      .eq("story_id", storyId)
      .then((r) => r.count ?? 0),
    storyHasCover(supabase, storyId, data.cover_url),
    storyHasSwipePromo(supabase, storyId)
  ]);

  return validateStoryBeforePublish({
    coverUrl: data.cover_url,
    genreId: data.genre_id,
    hasCover,
    hasSwipePromo,
    hook: data.hook,
    longDescription: data.long_description,
    seoDescription: data.seo_description,
    shortDescription: data.short_description,
    status: data.status,
    tagCount,
    title: data.title,
    visibility: data.visibility
  });
}

export async function assertStoryCanPublish(
  supabase: SupabaseClient,
  storyId: string,
  creatorProfileId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await validateStoryBeforePublishFromDb(
    supabase,
    storyId,
    creatorProfileId
  );

  if (!result.ok) {
    return { error: formatBlockingErrors(result.rules), ok: false };
  }

  return { ok: true };
}
