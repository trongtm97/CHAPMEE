import { notFound } from "next/navigation";
import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { createClient } from "@/lib/data/server";
import { mapReelsRow } from "@/lib/reels/map-reels-row";
import type { ReelsItemRecord } from "@/types/reels";

export async function assertOwnsReelsItem(
  profileId: string,
  reelId: string
): Promise<ReelsItemRecord> {
  const db = await createClient();
  const { data, error } = await db
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

  const db = await createClient();
  const { data, error } = await db
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
  const db = await createClient();

  const { data: story } = await db
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
      error: "Truyện liên k?t ph?i dang public tru?c khi dang Reels.",
      ok: false
    };
  }

  if (!chapterId) {
    return { ok: true };
  }

  const { data: episode } = await db
    .from("episodes")
    .select("status")
    .eq("id", chapterId)
    .maybeSingle();

  if (!episode) {
    return { error: "Không tìm th?y chuong.", ok: false };
  }

  if (!["published", "approved"].includes(episode.status)) {
    return {
      error: "Chương liên k?t ph?i dang public tru?c khi dang Reels.",
      ok: false
    };
  }

  return { ok: true };
}
