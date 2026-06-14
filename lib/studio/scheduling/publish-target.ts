import {
  validateChapterForPublish,
  validationErrorMessage,
  validateStoryForPublish
} from "@/lib/studio/scheduling/validate-publish";
import { publishChapterLinkedReelsPromo } from "@/lib/reels/publish-chapter-linked-reels-promo";
import { publishReelsItem } from "@/lib/reels/publish-reels-item";
import { mapReelsRow } from "@/lib/reels/map-reels-row";
import { isReelsScheduledTarget, type ScheduledTargetType } from "@/types/scheduling";
import { triggerColdStartAfterReelPublish, triggerColdStartAfterStoryPublish } from "@/lib/cold-start/hooks";
import type { DatabaseClient } from "@/lib/db/types";

export type PublishTargetResult = {
  ok: boolean;
  error?: string;
  storyId?: string | null;
};

export async function publishStoryTarget(
  db: DatabaseClient,
  storyId: string,
  creatorProfileId: string
): Promise<PublishTargetResult> {
  const validation = await validateStoryForPublish(db, storyId, creatorProfileId);

  if (!validation.ok) {
    return {
      error: validationErrorMessage(validation),
      ok: false
    };
  }

  const { data: storyRow } = await db
    .from("stories")
    .select("structure_type")
    .eq("id", storyId)
    .eq("creator_id", creatorProfileId)
    .maybeSingle();

  const now = new Date().toISOString();
  const publishPatch: Record<string, string> = {
    published_at: now,
    status: "published",
    visibility: "public"
  };

  if (storyRow?.structure_type === "standalone") {
    publishPatch.standalone_published_at = now;
  }

  const { error } = await db
    .from("stories")
    .update(publishPatch)
    .eq("id", storyId)
    .eq("creator_id", creatorProfileId)
    .neq("status", "published");

  if (error) {
    return { error: error.message, ok: false };
  }

  void triggerColdStartAfterStoryPublish(storyId);

  return { ok: true, storyId };
}

export async function publishChapterTarget(
  db: DatabaseClient,
  episodeId: string,
  storyId: string,
  creatorProfileId: string,
  ownerProfileId?: string | null
): Promise<PublishTargetResult> {
  const { data: episode } = await db
    .from("episodes")
    .select("episode_number, status, title")
    .eq("id", episodeId)
    .eq("story_id", storyId)
    .maybeSingle();

  if (!episode) {
    return { error: "Không tìm th?y chuong.", ok: false };
  }

  if (episode.status === "published") {
    return { ok: true, storyId };
  }

  const validation = await validateChapterForPublish(
    db,
    episodeId,
    storyId,
    creatorProfileId,
    { episodeNumber: episode.episode_number as number }
  );

  if (!validation.ok) {
    return {
      error: validationErrorMessage(validation),
      ok: false
    };
  }

  const now = new Date().toISOString();

  const { error } = await db
    .from("episodes")
    .update({
      published_at: now,
      status: "published"
    })
    .eq("id", episodeId)
    .eq("story_id", storyId)
    .neq("status", "published");

  if (error) {
    return { error: error.message, ok: false };
  }

  void tryPublishParentStoryIfReady(db, storyId, creatorProfileId);

  if (ownerProfileId) {
    void publishChapterLinkedReelsPromo(db, {
      chapterId: episodeId,
      chapterTitle: String(episode.title ?? `Chương ${episode.episode_number}`),
      ownerProfileId,
      storyId
    });
  }

  return { ok: true, storyId };
}

/** Sau khi đăng chương, tự đăng truyện nháp nếu đã đủ điều kiện (metadata + có chương public). */
async function tryPublishParentStoryIfReady(
  db: DatabaseClient,
  storyId: string,
  creatorProfileId: string
) {
  const { data: storyRow } = await db
    .from("stories")
    .select("status")
    .eq("id", storyId)
    .eq("creator_id", creatorProfileId)
    .maybeSingle();

  if (
    !storyRow ||
    storyRow.status === "published" ||
    storyRow.status === "approved"
  ) {
    return;
  }

  const validation = await validateStoryForPublish(db, storyId, creatorProfileId);

  if (!validation.ok) {
    return;
  }

  await publishStoryTarget(db, storyId, creatorProfileId);
}

export async function publishReelsTarget(
  db: DatabaseClient,
  reelId: string,
  ownerProfileId: string
): Promise<PublishTargetResult> {
  const { data, error: readError } = await db
    .from("reels_items")
    .select("*")
    .eq("id", reelId)
    .eq("owner_id", ownerProfileId)
    .maybeSingle();

  if (readError || !data) {
    return { error: readError?.message ?? "Không tìm th?y Reels.", ok: false };
  }

  const row = mapReelsRow(data);

  const result = await publishReelsItem(db, reelId, ownerProfileId, {
    backgroundImageUrl: row.backgroundImageUrl,
    body: row.body ?? "",
    chapterId: row.chapterId,
    cta: row.cta ?? "",
    ctaType: row.ctaType ?? "custom",
    hook: row.hook ?? "",
    storyId: row.storyId,
    title: row.title ?? ""
  });

  if (!result.ok) {
    return { error: result.error, ok: false };
  }

  return { ok: true, storyId: row.storyId };
}

export async function publishTargetByType(
  db: DatabaseClient,
  targetType: ScheduledTargetType,
  targetId: string,
  storyId: string | null,
  creatorProfileId: string,
  ownerProfileId?: string | null
): Promise<PublishTargetResult> {
  if (targetType === "story") {
    return publishStoryTarget(db, targetId, creatorProfileId);
  }

  if (targetType === "chapter") {
    if (!storyId) {
      return { error: "Thi?u story_id cho chuong.", ok: false };
    }

    return publishChapterTarget(
      db,
      targetId,
      storyId,
      creatorProfileId,
      ownerProfileId
    );
  }

  if (isReelsScheduledTarget(targetType)) {
    const { data: profile } = await db
      .from("creator_profiles")
      .select("user_id")
      .eq("id", creatorProfileId)
      .maybeSingle();

    if (!profile?.user_id) {
      return { error: "Không xác định được tác giả.", ok: false };
    }

    return publishReelsTarget(db, targetId, profile.user_id);
  }

  return { error: "Loại nội dung không hỗ trợ.", ok: false };
}
