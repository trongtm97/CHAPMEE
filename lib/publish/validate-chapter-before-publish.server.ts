import {
  createRule,
  formatBlockingErrors,
  summarizeChecklist
} from "@/lib/publish/checklist-utils";
import { validateChapterBeforePublish } from "@/lib/publish/validate-chapter-before-publish";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type { PublishChecklistResult } from "@/types/publish-checklist";
import type { DatabaseClient } from "@/lib/db/types";
import { EPISODE_BODY_SELECT } from "@/lib/chapters/episode-content-row";
import { resolvePublishContentSample } from "@/lib/chapters/validate-chapter-object-storage";
import { validateEpisodeObjectStorageForPublish } from "@/lib/chapters/validate-chapter-object-storage.server";

type EpisodeRow = {
  id: string;
  title: string;
  content: string | null;
  episode_number: number;
  status: string;
  updated_at: string;
  story_id: string;
  seo_description: string | null;
  structured_content?: unknown | null;
  content_storage_type?: string | null;
  content_object_key?: string | null;
  content_hash?: string | null;
  content_size_bytes?: number | null;
  plain_text_preview?: string | null;
  excerpt?: string | null;
  word_count?: number | null;
};

type StoryRow = {
  id: string;
  title: string;
  status: string;
  visibility: string;
};

const EPISODE_META_SELECT =
  "id, title, episode_number, status, updated_at, story_id, seo_description";

const EPISODE_SELECT_FULL = `${EPISODE_META_SELECT}, ${EPISODE_BODY_SELECT}`;
const EPISODE_SELECT_LEGACY =
  "id, title, episode_number, status, updated_at, story_id, seo_description, content, excerpt, structured_content, content_format, word_count";

function chapterNotFoundResult(message = "Không tìm thấy chương."): PublishChecklistResult {
  return summarizeChecklist([
    createRule({
      blocking: true,
      id: "chapter",
      label: "Không tìm thấy chương",
      message,
      ok: false,
      targetType: "chapter"
    })
  ]);
}

async function loadOwnedEpisode(
  db: DatabaseClient,
  episodeId: string,
  storyId: string,
  creatorProfileId: string
): Promise<
  | { ok: true; episode: EpisodeRow; story: StoryRow }
  | { ok: false; result: PublishChecklistResult }
> {
  const { data: story, error: storyError } = await db
    .from("stories")
    .select("id, title, status, visibility")
    .eq("id", storyId)
    .eq("creator_id", creatorProfileId)
    .maybeSingle();

  if (storyError) {
    return {
      ok: false,
      result: chapterNotFoundResult(
        isMissingSchemaError(storyError)
          ? "Không tải được thông tin truyện."
          : storyError.message
      )
    };
  }

  if (!story) {
    return {
      ok: false,
      result: summarizeChecklist([
        createRule({
          blocking: true,
          id: "owner",
          label: "Không có quyền",
          message: "Bạn không có quyền trên truyện này.",
          ok: false,
          targetType: "chapter"
        })
      ])
    };
  }

  let episodeResult = await db
    .from("episodes")
    .select(EPISODE_SELECT_FULL)
    .eq("id", episodeId)
    .eq("story_id", storyId)
    .maybeSingle();

  if (episodeResult.error && isMissingSchemaError(episodeResult.error)) {
    episodeResult = await db
      .from("episodes")
      .select(EPISODE_SELECT_LEGACY)
      .eq("id", episodeId)
      .eq("story_id", storyId)
      .maybeSingle();
  }

  if (episodeResult.error) {
    return {
      ok: false,
      result: chapterNotFoundResult(episodeResult.error.message)
    };
  }

  if (!episodeResult.data) {
    return { ok: false, result: chapterNotFoundResult() };
  }

  return {
    ok: true,
    episode: episodeResult.data as EpisodeRow,
    story: story as StoryRow
  };
}

export async function validateChapterBeforePublishFromDb(
  db: DatabaseClient,
  episodeId: string,
  storyId: string,
  creatorProfileId: string,
  options?: {
    episodeNumber?: number;
    authorNote?: string | null;
  }
): Promise<PublishChecklistResult> {
  const loaded = await loadOwnedEpisode(db, episodeId, storyId, creatorProfileId);

  if (!loaded.ok) {
    return loaded.result;
  }

  const { episode, story } = loaded;
  const episodeNumber = options?.episodeNumber ?? episode.episode_number;

  const [duplicateCount, hasReelsPromo, savedFresh] = await Promise.all([
    db
      .from("episodes")
      .select("id", { count: "exact", head: true })
      .eq("story_id", storyId)
      .eq("episode_number", episodeNumber)
      .neq("id", episodeId)
      .then((r) => r.count ?? 0),
    db
      .from("reels_items")
      .select("id", { count: "exact", head: true })
      .eq("chapter_id", episodeId)
      .eq("status", "published")
      .then((r) => (r.count ?? 0) > 0),
    checkChapterSavedFresh(db, storyId, episodeId, episode.updated_at)
  ]);

  const storageCheck = await validateEpisodeObjectStorageForPublish({
    id: episode.id,
    content: episode.content,
    structured_content: episode.structured_content,
    content_storage_type: episode.content_storage_type,
    content_object_key: episode.content_object_key,
    content_hash: episode.content_hash,
    content_size_bytes: episode.content_size_bytes,
    plain_text_preview: episode.plain_text_preview,
    excerpt: episode.excerpt,
    word_count: episode.word_count
  });

  const contentSample = resolvePublishContentSample({
    id: episode.id,
    content: episode.content,
    structured_content: episode.structured_content,
    content_storage_type: episode.content_storage_type,
    content_object_key: episode.content_object_key,
    plain_text_preview: episode.plain_text_preview,
    excerpt: episode.excerpt
  });

  const baseResult = validateChapterBeforePublish(
    {
      authorNote: options?.authorNote ?? null,
      content: contentSample,
      episodeNumber,
      hasDuplicateNumber: duplicateCount > 0,
      hasReelsPromo,
      isSaved: savedFresh,
      seoDescription: episode.seo_description,
      status: episode.status,
      storyValid: true,
      title: episode.title
    },
    {
      status: story.status,
      title: story.title,
      visibility: story.visibility
    }
  );

  if (!storageCheck.ok) {
    return summarizeChecklist([
      createRule({
        blocking: true,
        id: "object-storage",
        label: "Nội dung storage",
        message: storageCheck.message,
        ok: false,
        targetType: "chapter"
      }),
      ...baseResult.rules.filter((rule) => rule.id !== "content")
    ]);
  }

  return baseResult;
}

async function checkChapterSavedFresh(
  db: DatabaseClient,
  storyId: string,
  episodeId: string,
  episodeUpdatedAt: string
) {
  const { data: draft } = await db
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
  db: DatabaseClient,
  episodeId: string,
  storyId: string,
  creatorProfileId: string,
  options?: { episodeNumber?: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await validateChapterBeforePublishFromDb(
    db,
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
