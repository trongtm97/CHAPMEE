import {
  validateChapterForPublish,
  validationErrorMessage,
  validateStoryForPublish
} from "@/lib/studio/scheduling/validate-publish";
import { publishReelsItem } from "@/lib/reels/publish-reels-item";
import { mapReelsRow } from "@/lib/reels/map-reels-row";
import { isReelsScheduledTarget, type ScheduledTargetType } from "@/types/scheduling";
import { triggerColdStartAfterReelPublish, triggerColdStartAfterStoryPublish } from "@/lib/cold-start/hooks";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PublishTargetResult = {
  ok: boolean;
  error?: string;
  storyId?: string | null;
};

export async function publishStoryTarget(
  supabase: SupabaseClient,
  storyId: string,
  creatorProfileId: string
): Promise<PublishTargetResult> {
  const validation = await validateStoryForPublish(supabase, storyId, creatorProfileId);

  if (!validation.ok) {
    return {
      error: validationErrorMessage(validation),
      ok: false
    };
  }

  const { data: storyRow } = await supabase
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

  const { error } = await supabase
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
  supabase: SupabaseClient,
  episodeId: string,
  storyId: string,
  creatorProfileId: string
): Promise<PublishTargetResult> {
  const { data: episode } = await supabase
    .from("episodes")
    .select("episode_number, status")
    .eq("id", episodeId)
    .eq("story_id", storyId)
    .maybeSingle();

  if (!episode) {
    return { error: "Không tìm thấy chương.", ok: false };
  }

  if (episode.status === "published") {
    return { ok: true, storyId };
  }

  const validation = await validateChapterForPublish(
    supabase,
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

  const { error } = await supabase
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

  return { ok: true, storyId };
}

export async function publishReelsTarget(
  supabase: SupabaseClient,
  reelId: string,
  ownerProfileId: string
): Promise<PublishTargetResult> {
  const { data, error: readError } = await supabase
    .from("reels_items")
    .select("*")
    .eq("id", reelId)
    .eq("owner_id", ownerProfileId)
    .maybeSingle();

  if (readError || !data) {
    return { error: readError?.message ?? "Không tìm thấy Reels.", ok: false };
  }

  const row = mapReelsRow(data);

  const result = await publishReelsItem(supabase, reelId, ownerProfileId, {
    backgroundImageUrl: row.backgroundImageUrl,
    body: row.body,
    chapterId: row.chapterId,
    cta: row.cta ?? "",
    ctaType: row.ctaType ?? "custom",
    hook: row.hook,
    storyId: row.storyId,
    title: row.title ?? ""
  });

  if (!result.ok) {
    return { error: result.error, ok: false };
  }

  return { ok: true, storyId: row.storyId };
}

export async function publishTargetByType(
  supabase: SupabaseClient,
  targetType: ScheduledTargetType,
  targetId: string,
  storyId: string | null,
  creatorProfileId: string
): Promise<PublishTargetResult> {
  if (targetType === "story") {
    return publishStoryTarget(supabase, targetId, creatorProfileId);
  }

  if (targetType === "chapter") {
    if (!storyId) {
      return { error: "Thiếu story_id cho chương.", ok: false };
    }

    return publishChapterTarget(supabase, targetId, storyId, creatorProfileId);
  }

  if (isReelsScheduledTarget(targetType)) {
    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("user_id")
      .eq("id", creatorProfileId)
      .maybeSingle();

    if (!profile?.user_id) {
      return { error: "Không xác định được tác giả.", ok: false };
    }

    return publishReelsTarget(supabase, targetId, profile.user_id);
  }

  return { error: "Loại nội dung không hỗ trợ.", ok: false };
}
