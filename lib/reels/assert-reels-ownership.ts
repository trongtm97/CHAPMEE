import { notFound } from "next/navigation";
import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { createClient } from "@/lib/supabase/server";
import { mapReelsRow } from "@/lib/reels/map-reels-row";
import type { ReelsItemRecord } from "@/types/reels";

export async function assertOwnsReelsItem(
  profileId: string,
  reelId: string
): Promise<ReelsItemRecord> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reels_items")
    .select("*")
    .eq("id", reelId)
    .eq("owner_id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  return mapReelsRow(data);
}

export async function assertStoryLinkForReels(
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
      error: "Truyện liên kết phải đang public trước khi đăng Reels.",
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
      error: "Chương liên kết phải đang public trước khi đăng Reels.",
      ok: false
    };
  }

  return { ok: true };
}
