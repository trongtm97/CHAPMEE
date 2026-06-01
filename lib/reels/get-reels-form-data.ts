import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { createClient } from "@/lib/supabase/server";
import { assertOwnsReelsItem } from "@/lib/reels/assert-reels-ownership";
import { mapReelsListRow } from "@/lib/reels/map-reels-row";

export async function getCreatorStoriesForReels(creatorProfile: CreatorProfile) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select("id, title, slug, cover_url, hook, short_description, status, visibility")
    .eq("creator_id", creatorProfile.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return { error: error.message, stories: [] };
  }

  return { error: null, stories: data ?? [] };
}

export async function getChaptersForReelsStory(storyId: string, creatorProfile: CreatorProfile) {
  await assertCreatorOwnsStory(creatorProfile, storyId);
  const supabase = await createClient();

  const { data, error } = await supabase
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
  const supabase = await createClient();
  const record = await assertOwnsReelsItem(profileId, reelId);

  const { data, error } = await supabase
    .from("reels_items")
    .select(
      "*, stories!inner(title, slug, cover_url), episodes(title, episode_number, content)"
    )
    .eq("id", reelId)
    .maybeSingle();

  if (error || !data) {
    return { error: error?.message ?? "Không tìm thấy Reels.", item: null, record: null };
  }

  return {
    error: null,
    item: mapReelsListRow(data as Parameters<typeof mapReelsListRow>[0]),
    record
  };
}
