import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { createClient } from "@/lib/supabase/server";
import { assertOwnsSwipeItem } from "@/lib/swipe/assert-swipe-ownership";
import { mapSwipeListRow } from "@/lib/swipe/map-swipe-row";

export async function getCreatorStoriesForSwipe(creatorProfile: CreatorProfile) {
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

export async function getChaptersForSwipeStory(storyId: string, creatorProfile: CreatorProfile) {
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

export async function getSwipeItemForEdit(profileId: string, swipeId: string) {
  const supabase = await createClient();
  const record = await assertOwnsSwipeItem(profileId, swipeId);

  const { data, error } = await supabase
    .from("swipe_items")
    .select(
      "*, stories!inner(title, slug, cover_url), episodes(title, episode_number, content)"
    )
    .eq("id", swipeId)
    .maybeSingle();

  if (error || !data) {
    return { error: error?.message ?? "Không tìm thấy Swipe.", item: null, record: null };
  }

  return {
    error: null,
    item: mapSwipeListRow(data as Parameters<typeof mapSwipeListRow>[0]),
    record
  };
}
