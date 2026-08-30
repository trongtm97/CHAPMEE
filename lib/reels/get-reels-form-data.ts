import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { createClient } from "@/lib/data/server";
import { assertOwnsReelsItem } from "@/lib/reels/assert-reels-ownership";
import { mapReelsListRow } from "@/lib/reels/map-reels-row";
import { loadReelsContentObject } from "@/lib/storage/reels-content-storage";

export async function getCreatorStoriesForReels(creatorProfile: CreatorProfile) {
  const db = await createClient();
  const { data, error } = await db
    .from("stories")
    .select("id, title, slug, cover_url, hook, short_description, long_description, status, visibility")
    .eq("creator_id", creatorProfile.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return { error: error.message, stories: [] };
  }

  return { error: null, stories: data ?? [] };
}

export async function getChaptersForReelsStory(storyId: string, creatorProfile: CreatorProfile) {
  await assertCreatorOwnsStory(creatorProfile, storyId);
  const db = await createClient();

  const { data, error } = await db
    .from("episodes")
    .select("id, title, episode_number, content, background_image_url, status")
    .eq("story_id", storyId)
    .order("episode_number", { ascending: true });

  if (error) {
    return { chapters: [], error: error.message };
  }

  return { chapters: data ?? [], error: null };
}

export async function getReelsItemForEdit(profileId: string, reelId: string) {
  const db = await createClient();
  const record = await assertOwnsReelsItem(profileId, reelId);

  const { data, error } = await db
    .from("reels_items")
    .select(
      "*, stories!inner(title, slug, cover_url), episodes(title, episode_number, content)"
    )
    .eq("id", reelId)
    .maybeSingle();

  if (error || !data) {
    return { error: error?.message ?? "Không tìm th?y Reels.", item: null, record: null };
  }

  const item = mapReelsListRow(data as Parameters<typeof mapReelsListRow>[0]);

  // When canonical text lives in S3, hydrate title/hook/body/cta for the edit form.
  if (item.contentStorageType === "s3" && item.contentObjectKey) {
    try {
      const loaded = await loadReelsContentObject({
        expectedHash: item.contentHash ?? undefined,
        objectKey: item.contentObjectKey
      });
      item.title = loaded.envelope.title;
      item.hook = loaded.envelope.hook;
      item.body = loaded.envelope.body;
      item.cta = loaded.envelope.cta;
    } catch (s3Error) {
      return {
        error:
          s3Error instanceof Error
            ? `Không đọc được Reels text từ S3: ${s3Error.message}`
            : "Không đọc được Reels text từ S3.",
        item: null,
        record
      };
    }
  }

  return {
    error: null,
    item,
    record
  };
}
