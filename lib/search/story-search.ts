import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import type { DatabaseClient } from "@/lib/db/types";
import { escapeIlikePattern } from "@/lib/stories/story-catalog-query";
import { searchPublicStoryIdsByFullText } from "@/lib/stories/search-public-stories";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";

export type StorySearchHit = {
  id: string;
  title: string;
  slug: string;
  publicCode: string;
  hook: string | null;
  shortDescription: string | null;
  coverUrl: string | null;
  publishedAt: string | null;
};

/**
 * Search stories using PostgreSQL metadata only (tsvector RPC or ilike fallback).
 * Does not read chapter bodies from S3.
 */
export async function searchStoriesMetadata(
  db: DatabaseClient,
  query: string,
  options?: { limit?: number; genreStoryIds?: string[] }
): Promise<StorySearchHit[]> {
  const trimmed = query.trim();
  const limit = options?.limit ?? 40;
  if (trimmed.length < 2) {
    return [];
  }

  const ftsIds = await searchPublicStoryIdsByFullText(db, trimmed, limit);
  let storyQuery = db
    .from("stories")
    .select(
      "id, title, slug, public_code, hook, short_description, cover_url, published_at"
    )
    .eq("visibility", "public")
    .in("status", [...publicContentStatuses])
    .limit(limit);

  if (options?.genreStoryIds?.length) {
    storyQuery = storyQuery.in("id", options.genreStoryIds);
  }

  if (ftsIds && ftsIds.length > 0) {
    storyQuery = storyQuery.in("id", ftsIds);
  } else {
    const pattern = `%${escapeIlikePattern(trimmed)}%`;
    storyQuery = storyQuery.or(
      `title.ilike.${pattern},slug.ilike.${pattern},hook.ilike.${pattern},short_description.ilike.${pattern}`
    );
  }

  const { data, error } = await storyQuery;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    publicCode: String(row.public_code),
    hook: row.hook as string | null,
    shortDescription: row.short_description as string | null,
    coverUrl: resolveStoryCoverUrl(row.cover_url as string | null),
    publishedAt: row.published_at as string | null
  }));
}
