import {
  createRule,
  formatBlockingErrors,
  isEpisodeStatusBlockedForPublish,
  isStoryHiddenForPublish,
  isStoryStatusBlockedForPublish,
  summarizeChecklist
} from "@/lib/publish/checklist-utils";
import { validateStoryBeforePublish } from "@/lib/publish/validate-story-before-publish";
import type { StoryPublishInput } from "@/lib/publish/validate-story-before-publish";
import type { PublishChecklistResult } from "@/types/publish-checklist";
import { CHAPTER_CONTENT_MIN_CHARS } from "@/types/publish-checklist";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ChapterPublishInput = {
  title?: string | null;
  content?: string | null;
  episodeNumber?: number;
  status?: string | null;
  seoDescription?: string | null;
  authorNote?: string | null;
  isSaved?: boolean;
  hasDuplicateNumber?: boolean;
  story?: StoryPublishInput | null;
  storyValid?: boolean;
  hasSwipePromo?: boolean;
};

export function validateChapterBeforePublish(
  chapter: ChapterPublishInput,
  story?: StoryPublishInput | null
): PublishChecklistResult {
  const content = chapter.content?.trim() ?? "";
  const storyInput = story ?? chapter.story ?? null;
  const storyBlocked = storyInput
    ? isStoryStatusBlockedForPublish(storyInput.status) ||
      isStoryHiddenForPublish(storyInput.status, storyInput.visibility)
    : false;

  const chapterRules = [
    createRule({
      blocking: true,
      id: "title",
      label: "Thiếu tiêu đề chương",
      message: "Thiếu tiêu đề chương.",
      ok: Boolean(chapter.title?.trim()),
      targetType: "chapter"
    }),
    createRule({
      blocking: true,
      id: "content",
      label: "Thiếu nội dung chương",
      message: "Thiếu nội dung chương.",
      ok: Boolean(content),
      targetType: "chapter"
    }),
    createRule({
      blocking: true,
      id: "saved",
      label: "Nội dung chưa được lưu",
      message: "Lưu chương trước khi đăng hoặc lên lịch.",
      ok: chapter.isSaved !== false,
      targetType: "chapter"
    }),
    createRule({
      blocking: true,
      id: "story",
      label: "Chưa thuộc truyện hợp lệ",
      message: "Chương phải thuộc một truyện hợp lệ của bạn.",
      ok: chapter.storyValid !== false && Boolean(storyInput),
      targetType: "chapter"
    }),
    createRule({
      blocking: true,
      id: "number",
      label: "Số chương bị trùng",
      message: "Số chương đã tồn tại trong truyện. Đổi số chương.",
      ok: !chapter.hasDuplicateNumber,
      targetType: "chapter"
    }),
    createRule({
      blocking: true,
      id: "parent-story",
      label: "Truyện cha chưa đủ điều kiện public",
      message: "Truyện cha chưa đủ điều kiện đăng (ẩn, từ chối hoặc thiếu thông tin).",
      ok: storyInput ? !storyBlocked : false,
      targetType: "chapter"
    }),
    createRule({
      blocking: true,
      id: "status",
      label: "Chương đang bị chặn đăng",
      message: "Chương đang ở trạng thái không được đăng (từ chối hoặc chờ duyệt).",
      ok: !isEpisodeStatusBlockedForPublish(chapter.status),
      targetType: "chapter"
    }),
    createRule({
      id: "content-length",
      label: "Nội dung quá ngắn",
      message: `Nội dung chương nên dài hơn ${CHAPTER_CONTENT_MIN_CHARS} ký tự.`,
      ok: content.length >= CHAPTER_CONTENT_MIN_CHARS,
      targetType: "chapter",
      warnIfFail: true
    }),
    createRule({
      id: "author-note",
      label: "Chưa có ghi chú tác giả",
      message: "Thêm ghi chú tác giả để trò chuyện với độc giả (tuỳ chọn).",
      ok: Boolean(chapter.authorNote?.trim()),
      targetType: "chapter",
      warnIfFail: true
    }),
    createRule({
      id: "seo",
      label: "Chưa có SEO description",
      message: "Thêm mô tả SEO cho chương.",
      ok: Boolean(chapter.seoDescription?.trim()),
      targetType: "chapter",
      warnIfFail: true
    }),
    createRule({
      id: "swipe-promo",
      label: "Chưa tạo Swipe quảng bá",
      message: "Tạo Swipe quảng bá cho chương (khuyến nghị).",
      ok: Boolean(chapter.hasSwipePromo),
      targetType: "chapter",
      warnIfFail: true
    })
  ];

  const chapterResult = summarizeChecklist(chapterRules);

  if (!storyInput) {
    return chapterResult;
  }

  const storyResult = validateStoryBeforePublish(storyInput);
  const parentRules = storyResult.rules.map((rule) => ({
    ...rule,
    id: `story-${rule.id}`,
    label: rule.label.startsWith("Truyện:")
      ? rule.label
      : `Truyện: ${rule.label}`,
    targetType: "story" as const
  }));

  return summarizeChecklist([...chapterResult.rules, ...parentRules]);
}

type EpisodeRow = {
  id: string;
  title: string;
  content: string;
  episode_number: number;
  status: string;
  updated_at: string;
  story_id: string;
  seo_description: string | null;
  stories:
    | {
        id: string;
        title: string;
        hook: string | null;
        short_description: string | null;
        long_description: string | null;
        cover_url: string | null;
        genre_id: string | null;
        status: string;
        visibility: string;
        creator_id: string;
        seo_description: string | null;
      }
    | {
        id: string;
        title: string;
        hook: string | null;
        short_description: string | null;
        long_description: string | null;
        cover_url: string | null;
        genre_id: string | null;
        status: string;
        visibility: string;
        creator_id: string;
        seo_description: string | null;
      }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function validateChapterBeforePublishFromDb(
  supabase: SupabaseClient,
  episodeId: string,
  storyId: string,
  creatorProfileId: string,
  options?: {
    episodeNumber?: number;
    authorNote?: string | null;
  }
): Promise<PublishChecklistResult> {
  const { data, error } = await supabase
    .from("episodes")
    .select(
      `id, title, content, episode_number, status, updated_at, story_id, seo_description,
      stories(id, title, hook, short_description, long_description, cover_url, genre_id, status, visibility, creator_id, seo_description)`
    )
    .eq("id", episodeId)
    .eq("story_id", storyId)
    .maybeSingle();

  if (error || !data) {
    return summarizeChecklist([
      createRule({
        blocking: true,
        id: "chapter",
        label: "Không tìm thấy chương",
        message: "Không tìm thấy chương.",
        ok: false,
        targetType: "chapter"
      })
    ]);
  }

  const episode = data as unknown as EpisodeRow;
  const story = firstRelation(episode.stories);

  if (!story || story.creator_id !== creatorProfileId) {
    return summarizeChecklist([
      createRule({
        blocking: true,
        id: "owner",
        label: "Không có quyền",
        message: "Bạn không có quyền trên truyện này.",
        ok: false,
        targetType: "chapter"
      })
    ]);
  }

  const episodeNumber = options?.episodeNumber ?? episode.episode_number;

  const [duplicateCount, tagCount, hasCover, hasSwipePromo, savedFresh] =
    await Promise.all([
      supabase
        .from("episodes")
        .select("id", { count: "exact", head: true })
        .eq("story_id", storyId)
        .eq("episode_number", episodeNumber)
        .neq("id", episodeId)
        .then((r) => r.count ?? 0),
      supabase
        .from("story_tags")
        .select("tag_id", { count: "exact", head: true })
        .eq("story_id", storyId)
        .then((r) => r.count ?? 0),
      supabase
        .from("story_images")
        .select("id", { count: "exact", head: true })
        .eq("story_id", storyId)
        .eq("is_current", true)
        .then((r) => (r.count ?? 0) > 0 || Boolean(story.cover_url?.trim())),
      supabase
        .from("swipe_items")
        .select("id", { count: "exact", head: true })
        .eq("chapter_id", episodeId)
        .eq("status", "published")
        .then((r) => (r.count ?? 0) > 0),
      checkChapterSavedFresh(supabase, storyId, episodeId, episode.updated_at)
    ]);

  return validateChapterBeforePublish(
    {
      authorNote: options?.authorNote ?? null,
      content: episode.content,
      episodeNumber,
      hasDuplicateNumber: duplicateCount > 0,
      hasSwipePromo,
      isSaved: savedFresh,
      seoDescription: episode.seo_description,
      status: episode.status,
      storyValid: true,
      title: episode.title
    },
    {
      coverUrl: story.cover_url,
      genreId: story.genre_id,
      hasCover,
      hook: story.hook,
      longDescription: story.long_description,
      seoDescription: story.seo_description,
      shortDescription: story.short_description,
      status: story.status,
      tagCount,
      title: story.title,
      visibility: story.visibility
    }
  );
}

async function checkChapterSavedFresh(
  supabase: SupabaseClient,
  storyId: string,
  episodeId: string,
  episodeUpdatedAt: string
) {
  const { data: draft } = await supabase
    .from("creator_drafts")
    .select("last_saved_at")
    .eq("draft_type", "chapter")
    .eq("story_id", storyId)
    .eq("chapter_id", episodeId)
    .eq("status", "draft")
    .maybeSingle();

  if (!draft?.last_saved_at) {
    return true;
  }

  return (
    new Date(draft.last_saved_at).getTime() >=
    new Date(episodeUpdatedAt).getTime() - 5000
  );
}

export async function assertChapterCanPublish(
  supabase: SupabaseClient,
  episodeId: string,
  storyId: string,
  creatorProfileId: string,
  options?: { episodeNumber?: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await validateChapterBeforePublishFromDb(
    supabase,
    episodeId,
    storyId,
    creatorProfileId,
    options
  );

  if (!result.ok) {
    return { error: formatBlockingErrors(result.rules), ok: false };
  }

  return { ok: true };
}
