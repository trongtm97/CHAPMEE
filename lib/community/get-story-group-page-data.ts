import { eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCommunityFeed } from "@/lib/community/getCommunityFeed";
import { getStoryGroupBySlug } from "@/lib/community/get-story-group-by-slug";
import { enrichGroupFeedItems } from "@/lib/community-sync/enrich-group-feed-items";
import { getStoryGroupFeedByStoryId } from "@/lib/community-sync/get-story-group-feed";
import { getStoryGroupFeedFilterPresence } from "@/lib/community-sync/review-sync";
import { getCommunitySyncSettings } from "@/lib/community-sync/sync-settings";
import { getStoryReadingProgress } from "@/lib/stories/get-story-reading-progress";
import { db } from "@/lib/db";
import { storyGroups } from "@/lib/db/schema/story-community-sync";
import { getPublicStoryAudioData } from "@/src/lib/audio/public-audio";
import { getPublishedStoryFilmAdaptationsPublic } from "@/src/lib/film-adaptations/public-films";
import type { CommunityPost } from "@/lib/community/getCommunityFeed";
import type { EnrichedGroupFeedItemView } from "@/lib/community-sync/enrich-group-feed-items";
import type { StoryGroupFeedFilterPresence } from "@/lib/community-sync/adapters/types";
import type { StoryCommunityGroup } from "@/types/community";
import type { StoryReadingProgress } from "@/types/chapter";

export type StoryGroupPageData = {
  group: StoryCommunityGroup;
  story: {
    id: string;
    title: string;
    slug: string;
    publicCode: string;
    coverUrl: string | null;
    authorName: string | null;
    hook: string | null;
  };
  memberCount: number;
  activityCount: number;
  storyPosts: CommunityPost[];
  initialActivity: {
    items: EnrichedGroupFeedItemView[];
    nextCursor: string | null;
    hasMore: boolean;
  };
  readingProgress: StoryReadingProgress | null;
  hasAudioModule: boolean;
  hasFilmsModule: boolean;
  filterPresence: StoryGroupFeedFilterPresence & {
    showReels: boolean;
    showAudio: boolean;
    showFilms: boolean;
    showReviews: boolean;
  };
};

export async function getStoryGroupPageData(
  slugOrId: string
): Promise<{ data: StoryGroupPageData | null; error: string | null }> {
  const [{ group, story, error }, feed, user] = await Promise.all([
    getStoryGroupBySlug(slugOrId),
    getCommunityFeed(),
    getCurrentUser()
  ]);

  if (error) {
    return { data: null, error };
  }

  if (!group || !story) {
    return { data: null, error: null };
  }

  const registryRows = await db
    .select({
      memberCount: storyGroups.memberCount,
      activityCount: storyGroups.activityCount
    })
    .from(storyGroups)
    .where(eq(storyGroups.storyId, story.id))
    .limit(1);

  const registry = registryRows[0];

  const [activityPage, readingProgress, audioData, films, feedPresence, syncSettings] =
    await Promise.all([
      getStoryGroupFeedByStoryId(story.id, { limit: 10 }),
      getStoryReadingProgress(story.id, user.profile?.id),
      getPublicStoryAudioData(story.id).catch(() => ({ items: [] as { id: string }[] })),
      getPublishedStoryFilmAdaptationsPublic(story.id).catch(() => []),
      getStoryGroupFeedFilterPresence(story.id),
      getCommunitySyncSettings()
    ]);

  const hasAudioModule = audioData.items.length > 0;
  const hasFilmsModule = films.length > 0;

  const enrichedItems = await enrichGroupFeedItems(activityPage.items);

  const storyPosts = feed.posts.filter(
    (post) => post.storyId === story.id || post.relatedStorySlug === story.slug
  );

  return {
    error: null,
    data: {
      group: {
        ...group,
        memberCount: registry?.memberCount ?? group.memberCount,
        statusLine:
          registry && registry.activityCount > 0
            ? `${registry.activityCount} hoạt động gần đây`
            : group.statusLine
      },
      story,
      memberCount: registry?.memberCount ?? group.memberCount,
      activityCount: registry?.activityCount ?? 0,
      storyPosts,
      initialActivity: {
        items: enrichedItems,
        nextCursor: activityPage.nextCursor,
        hasMore: activityPage.hasMore
      },
      readingProgress,
      hasAudioModule,
      hasFilmsModule,
      filterPresence: {
        ...feedPresence,
        showReels: feedPresence.hasReels,
        showAudio: feedPresence.hasAudio || hasAudioModule,
        showFilms: feedPresence.hasFilms || hasFilmsModule,
        showReviews: feedPresence.hasReviews || syncSettings.syncReviews
      }
    }
  };
}

/** Resolve story UUID from slug for API paths that accept either. */
export async function resolveStoryIdFromGroupParam(slugOrId: string) {
  const { rows } = await db.execute(sql`
    select id from public.stories
    where slug = ${slugOrId} or id = ${slugOrId}::uuid
    limit 1
  `);
  return (rows[0] as { id: string } | undefined)?.id ?? null;
}
