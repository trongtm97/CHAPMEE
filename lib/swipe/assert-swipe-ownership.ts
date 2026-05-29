import { notFound } from "next/navigation";
import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { createClient } from "@/lib/supabase/server";
import { mapSwipeRow } from "@/lib/swipe/map-swipe-row";
import type { SwipeItemRecord } from "@/types/swipe";

export async function assertOwnsSwipeItem(
  profileId: string,
  swipeId: string
): Promise<SwipeItemRecord> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("swipe_items")
    .select("*")
    .eq("id", swipeId)
    .eq("owner_id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  return mapSwipeRow(data);
}

export async function assertStoryLinkForSwipe(
  creatorProfile: CreatorProfile,
  storyId: string,
  chapterId?: string | null
) {
  await assertCreatorOwnsStory(creatorProfile, storyId);

  if (!chapterId) {
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("episodes")
    .select("id")
    .eq("id", chapterId)
    .eq("story_id", storyId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Chương không thuộc truyện đã chọn.");
  }
}

export async function assertLinkedContentIsPublic(
  storyId: string,
  chapterId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: story } = await supabase
    .from("stories")
    .select("status, visibility")
    .eq("id", storyId)
    .maybeSingle();

  if (!story) {
    return { error: "Không tìm thấy truyện.", ok: false };
  }

  if (
    !["published", "approved"].includes(story.status) ||
    story.visibility !== "public"
  ) {
    return {
      error: "Truyện liên kết phải đang public trước khi đăng Swipe.",
      ok: false
    };
  }

  if (!chapterId) {
    return { ok: true };
  }

  const { data: episode } = await supabase
    .from("episodes")
    .select("status")
    .eq("id", chapterId)
    .maybeSingle();

  if (!episode) {
    return { error: "Không tìm thấy chương.", ok: false };
  }

  if (!["published", "approved"].includes(episode.status)) {
    return {
      error: "Chương liên kết phải đang public trước khi đăng Swipe.",
      ok: false
    };
  }

  return { ok: true };
}
