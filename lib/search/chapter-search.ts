import type { DatabaseClient } from "@/lib/db/types";
import { searchPublicEpisodeIdsByFullText } from "@/lib/episodes/search-public-episodes";
import { escapeIlikePattern } from "@/lib/stories/story-catalog-query";
import { getChapterUrl } from "@/lib/urls/paths";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";

export type ChapterSearchHit = {
  id: string;
  title: string;
  slug: string;
  publicCode: string;
  episodeNumber: number;
  excerpt: string | null;
  plainTextPreview: string | null;
  publishedAt: string | null;
  storyId: string;
  storyTitle: string;
  storySlug: string;
  storyPublicCode: string;
  href: string;
  snippet: string | null;
};

/**
 * Search published chapters via DB fields only (title, excerpt, plain_text_preview).
 * Never loads full content from S3.
 */
export async function searchChaptersMetadata(
  db: DatabaseClient,
  query: string,
  options?: { limit?: number }
): Promise<ChapterSearchHit[]> {
  const trimmed = query.trim();
  const limit = options?.limit ?? 30;
  if (trimmed.length < 2) {
    return [];
  }

  const ftsIds = await searchPublicEpisodeIdsByFullText(db, trimmed, limit);
  let episodeQuery = db
    .from("episodes")
    .select(
      `id, title, slug, public_code, episode_number, excerpt, plain_text_preview, published_at,
       stories!inner(id, title, slug, public_code, status, visibility)`
    )
    .in("status", [...publicContentStatuses])
    .in("stories.status", [...publicContentStatuses])
    .eq("stories.visibility", "public")
    .limit(limit);

  if (ftsIds && ftsIds.length > 0) {
    episodeQuery = episodeQuery.in("id", ftsIds);
  } else {
    const pattern = `%${escapeIlikePattern(trimmed)}%`;
    episodeQuery = episodeQuery.or(
      `title.ilike.${pattern},excerpt.ilike.${pattern},plain_text_preview.ilike.${pattern}`
    );
  }

  const { data, error } = await episodeQuery;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).flatMap((row) => {
    const storyRaw = row.stories as
      | { id: string; title: string; slug: string; public_code: string }
      | { id: string; title: string; slug: string; public_code: string }[]
      | null;
    const story = Array.isArray(storyRaw) ? storyRaw[0] : storyRaw;
    if (!story) {
      return [];
    }

    const excerpt = row.excerpt as string | null;
    const preview = row.plain_text_preview as string | null;

    return [
      {
        id: String(row.id),
        title: String(row.title),
        slug: String(row.slug),
        publicCode: String(row.public_code),
        episodeNumber: Number(row.episode_number),
        excerpt,
        plainTextPreview: preview,
        publishedAt: row.published_at as string | null,
        storyId: String(story.id),
        storyTitle: String(story.title),
        storySlug: String(story.slug),
        storyPublicCode: String(story.public_code),
        href: getChapterUrl(
          { slug: story.slug, public_code: story.public_code },
          { slug: String(row.slug), public_code: String(row.public_code) }
        ),
        snippet: preview?.slice(0, 200) ?? excerpt?.slice(0, 200) ?? null
      }
    ];
  });
}
