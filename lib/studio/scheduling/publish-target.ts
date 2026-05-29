import {
  validateChapterForPublish,
  validationErrorMessage,
  validateStoryForPublish
} from "@/lib/studio/scheduling/validate-publish";
import { publishSwipeItem } from "@/lib/swipe/publish-swipe-item";
import { mapSwipeRow } from "@/lib/swipe/map-swipe-row";
import type { ScheduledTargetType } from "@/types/scheduling";
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

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("stories")
    .update({
      published_at: now,
      status: "published",
      visibility: "public"
    })
    .eq("id", storyId)
    .eq("creator_id", creatorProfileId)
    .neq("status", "published");

  if (error) {
    return { error: error.message, ok: false };
  }

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

export async function publishSwipeTarget(
  supabase: SupabaseClient,
  swipeId: string,
  ownerProfileId: string
): Promise<PublishTargetResult> {
  const { data, error: readError } = await supabase
    .from("swipe_items")
    .select("*")
    .eq("id", swipeId)
    .eq("owner_id", ownerProfileId)
    .maybeSingle();

  if (readError || !data) {
    return { error: readError?.message ?? "Không tìm thấy Swipe.", ok: false };
  }

  const row = mapSwipeRow(data);

  const result = await publishSwipeItem(supabase, swipeId, ownerProfileId, {
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

  if (targetType === "swipe") {
    const { data: profile } = await supabase
      .from("creator_profiles")
      .select("user_id")
      .eq("id", creatorProfileId)
      .maybeSingle();

    if (!profile?.user_id) {
      return { error: "Không xác định được tác giả.", ok: false };
    }

    return publishSwipeTarget(supabase, targetId, profile.user_id);
  }

  return { error: "Loại nội dung không hỗ trợ.", ok: false };
}
