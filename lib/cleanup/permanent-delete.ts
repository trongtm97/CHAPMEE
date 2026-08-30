import { createClient } from "@/lib/data/server";
import { deleteChapterContentObject } from "@/lib/storage/chapter-content-storage";

const SOFT_DELETE_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000;

async function deleteRelatedReactions(targetIds: string[], targetType: string) {
  if (targetIds.length === 0) return;
  const db = await createClient();
  await db
    .from("reactions")
    .delete()
    .eq("target_type", targetType)
    .in("target_id", targetIds);
}

async function deleteRelatedReports(targetIds: string[], targetType: string) {
  if (targetIds.length === 0) return;
  const db = await createClient();
  await db
    .from("reports")
    .delete()
    .eq("target_type", targetType)
    .in("target_id", targetIds);
}

async function deleteRelatedModerationCases(targetIds: string[], targetType: string) {
  if (targetIds.length === 0) return;
  const db = await createClient();
  await db
    .from("moderation_cases")
    .delete()
    .eq("target_type", targetType)
    .in("target_id", targetIds);
}

async function deleteRelatedAnalyticsEvents(targetIds: string[]) {
  if (targetIds.length === 0) return;
  const db = await createClient();
  await db
    .from("analytics_events")
    .delete()
    .in("target_id", targetIds);
}

async function deleteRelatedReelsItems(storyIds: string[], episodeIds: string[]) {
  if (storyIds.length === 0 && episodeIds.length === 0) return;
  const db = await createClient();
  if (storyIds.length > 0) {
    await db.from("reels_items").delete().in("story_id", storyIds);
  }
  if (episodeIds.length > 0) {
    await db.from("reels_items").delete().in("chapter_id", episodeIds);
  }
}

async function deleteRelatedCommunityPosts(storyIds: string[]) {
  if (storyIds.length === 0) return;
  const db = await createClient();
  await db.from("community_posts").delete().in("story_id", storyIds);
}

async function deleteChapterContentFromS3(episodeIds: string[]) {
  if (episodeIds.length === 0) return;
  const db = await createClient();
  const { data: episodes } = await db
    .from("episodes")
    .select("id, content_object_key")
    .in("id", episodeIds)
    .not("content_object_key", "is", null);

  if (!episodes) return;

  for (const episode of episodes) {
    const key = episode.content_object_key as string | null;
    if (!key) continue;
    try {
      await deleteChapterContentObject({ objectKey: key });
    } catch {
      // best-effort cleanup
    }
  }
}

async function deleteStoryCoverImages(storyIds: string[]) {
  const db = await createClient();
  const { data: stories } = await db
    .from("stories")
    .select("id, cover_url")
    .in("id", storyIds)
    .not("cover_url", "is", null);

  if (!stories) return;

  for (const story of stories) {
    const coverUrl = story.cover_url as string | null;
    if (!coverUrl) continue;
    try {
      const { deleteObject } = await import("@/lib/storage/s3");
      await deleteObject(coverUrl);
    } catch {
      // best-effort cleanup
    }
  }
}

type CleanupResult = {
  deletedStories: number;
  deletedEpisodes: number;
  errors: string[];
};

/**
 * Permanently delete all stories (and their episodes) that were soft-deleted
 * more than 3 days ago. Also handles stand-alone soft-deleted episodes
 * whose parent story is not deleted (episode-level soft-delete).
 */
export async function permanentlyDeleteExpiredContent(): Promise<CleanupResult> {
  const db = await createClient();
  const errors: string[] = [];
  const cutoff = new Date(Date.now() - SOFT_DELETE_EXPIRY_MS).toISOString();

  // 1. Find expired soft-deleted stories
  const { data: expiredStories, error: fetchStoriesError } = await db
    .from("stories")
    .select("id")
    .lt("deleted_at", cutoff)
    .not("deleted_at", "is", null);

  if (fetchStoriesError) {
    return { deletedStories: 0, deletedEpisodes: 0, errors: [fetchStoriesError.message] };
  }

  const storyIds = (expiredStories ?? []).map(
    (row: { id: string }) => row.id as string
  );

  // 2. Find expired soft-deleted episodes whose story is NOT deleted
  const { data: expiredEpisodes, error: fetchEpisodesError } = await db
    .from("episodes")
    .select("id, story_id")
    .lt("deleted_at", cutoff)
    .not("deleted_at", "is", null);

  if (fetchEpisodesError) {
    return { deletedStories: 0, deletedEpisodes: 0, errors: [fetchEpisodesError.message] };
  }

  const allEpisodeRows = (expiredEpisodes ?? []) as Array<{
    id: string;
    story_id: string;
  }>;
  const deletedStorySet = new Set(storyIds);
  const orphanEpisodeIds = allEpisodeRows
    .filter((row) => !deletedStorySet.has(row.story_id as string))
    .map((row) => row.id as string);
  const allEpisodeIds = [
    ...new Set([
      ...allEpisodeRows.map((row) => row.id as string),
    ])
  ];

  if (storyIds.length === 0 && orphanEpisodeIds.length === 0) {
    return { deletedStories: 0, deletedEpisodes: 0, errors: [] };
  }

  // 3. Cleanup related data
  try {
    await Promise.all([
      deleteChapterContentFromS3(allEpisodeIds),
      deleteRelatedReactions(storyIds, "story"),
      deleteRelatedReactions(allEpisodeIds, "episode"),
      deleteRelatedReports(storyIds, "story"),
      deleteRelatedReports(allEpisodeIds, "episode"),
      deleteRelatedModerationCases(storyIds, "story"),
      deleteRelatedModerationCases(allEpisodeIds, "episode"),
      deleteRelatedAnalyticsEvents([...storyIds, ...allEpisodeIds]),
      deleteRelatedReelsItems(storyIds, allEpisodeIds),
      deleteRelatedCommunityPosts(storyIds),
      deleteStoryCoverImages(storyIds),
    ]);
  } catch (caught) {
    errors.push(
      caught instanceof Error ? caught.message : "Cleanup step failed"
    );
  }

  // 4. Delete orphan episodes first (stand-alone deleted episodes)
  for (const episodeId of orphanEpisodeIds) {
    try {
      await db.from("episodes").delete().eq("id", episodeId);
    } catch (caught) {
      errors.push(
        caught instanceof Error
          ? caught.message
          : `Failed to delete episode ${episodeId}`
      );
    }
  }

  // 5. Delete stories (FK CASCADE handles episodes, comments, follows, etc.)
  for (const storyId of storyIds) {
    try {
      await db.from("stories").delete().eq("id", storyId);
    } catch (caught) {
      errors.push(
        caught instanceof Error
          ? caught.message
          : `Failed to delete story ${storyId}`
      );
    }
  }

  return {
    deletedStories: storyIds.length,
    deletedEpisodes: orphanEpisodeIds.length,
    errors,
  };
}
