import { loadCurrentStoryImagesByStoryIds } from "@/lib/images/get-current-story-image";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import { normalizeStoryStructureType } from "@/lib/stories/story-structure";
import { normalizeDbContentOrigin } from "@/lib/stories/story-origin";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";
import type { DatabaseClient } from "@/lib/db/types";
import type { FeedCandidate, FeedDeliveryMeta } from "@/types/feed-mixer";
import { logRecommendationExposureBatch } from "@/lib/fair-distribution/log-exposure";

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string;
  cover_url: string | null;
  hook: string | null;
  short_description: string | null;
  long_description: string | null;
  is_completed: boolean | null;
  published_at: string | null;
  structure_type?: string | null;
  standalone_reading_time_minutes?: number | null;
  content_origin?: string | null;
  rights_status?: string | null;
  creator_profiles:
    | {
        id: string;
        user_id: string | null;
        pen_name: string | null;
        profiles?: { display_name: string | null; username: string | null } | null;
      }
    | {
        id: string;
        user_id: string | null;
        pen_name: string | null;
        profiles?: { display_name: string | null; username: string | null } | null;
      }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function enrichDiscoverCandidates(
  db: DatabaseClient,
  candidates: FeedCandidate[],
  delivery: { requestId: string; algorithmVersion: string },
  tagsByStory: Map<string, string[]>
): Promise<DiscoverStory[]> {
  const storyIds = candidates.map((c) => c.storyId);
  if (storyIds.length === 0) return [];

  const { data: rows } = await db
    .from("stories")
    .select(
      "id, title, slug, public_code, cover_url, hook, short_description, long_description, is_completed, published_at, structure_type, standalone_reading_time_minutes, content_origin, rights_status, creator_profiles(id, user_id, pen_name, profiles!creator_profiles_user_id_fkey(display_name, username))"
    )
    .in("id", storyIds);

  const rowById = new Map(
    ((rows ?? []) as unknown as StoryRow[]).map((row) => [row.id, row])
  );

  const { getStoryTaxonomyLabelsByStoryIds } = await import(
    "@/lib/taxonomy/discover-bridge"
  );
  const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(
    db,
    storyIds
  );

  const [{ data: episodeCounts }, imageByStoryId] = await Promise.all([
    db
      .from("episodes")
      .select("story_id")
      .in("story_id", storyIds)
      .in("status", ["approved", "published"]),
    loadCurrentStoryImagesByStoryIds(db, storyIds)
  ]);

  const episodeCountByStory = new Map<string, number>();
  for (const episode of episodeCounts ?? []) {
    const sid = episode.story_id as string;
    episodeCountByStory.set(sid, (episodeCountByStory.get(sid) ?? 0) + 1);
  }

  const enriched = candidates
    .map((candidate) => {
      const row = rowById.get(candidate.storyId);
      if (!row) return null;
      const taxonomy = taxonomyByStory.get(row.id);
      const creator = firstRelation(row.creator_profiles);
      const currentImage = imageByStoryId.get(row.id) ?? null;
      const feed: FeedDeliveryMeta = {
        requestId: delivery.requestId,
        algorithmVersion: delivery.algorithmVersion,
        candidatePool: candidate.pool
      };
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        publicCode: row.public_code,
        structureType: normalizeStoryStructureType(row.structure_type),
        episodeCount: episodeCountByStory.get(row.id) ?? 0,
        standaloneReadingTimeMinutes: row.standalone_reading_time_minutes ?? 0,
        coverUrl: resolveStoryCoverUrl(row.cover_url),
        currentImage,
        hook: row.hook,
        shortDescription: row.short_description,
        longDescription: row.long_description,
        genreName: taxonomy?.mainGenreName ?? null,
        genreSlug: taxonomy?.mainGenreSlug ?? null,
        creatorName: creator
          ? resolvePublicDisplayName(firstRelation(creator.profiles), creator)
          : null,
        creatorUsername:
          firstRelation(creator?.profiles ?? null)?.username?.trim().toLowerCase() ??
          null,
        creatorUserId: creator?.user_id ?? candidate.authorUserId ?? null,
        isCompleted: Boolean(row.is_completed),
        publishedAt: row.published_at,
        tagNames:
          tagsByStory.get(row.id)?.length
            ? (tagsByStory.get(row.id) ?? [])
            : (taxonomy?.tagNames ?? []),
        score: candidate.mixerScore,
        contentOrigin: normalizeDbContentOrigin(row.content_origin),
        rightsStatus: row.rights_status ?? null,
        feed
      } satisfies DiscoverStory;
    })
    .filter(Boolean) as DiscoverStory[];

  void logRecommendationExposureBatch(db, candidates, {
    surface: "discover",
    requestId: delivery.requestId
  });

  return enriched;
}
