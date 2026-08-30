import { profileAvatarUrlFromRow } from "@/lib/profile/map-profile-row";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { resolveStoredMediaUrl } from "@/lib/media/media-resolver";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import { getProfileUrl } from "@/lib/profile/profile-url";
import { escapeIlikePattern } from "@/lib/stories/story-catalog-query";
import { searchPublicEpisodeIdsByFullText } from "@/lib/episodes/search-public-episodes";
import { searchPublicStoryIdsByFullText } from "@/lib/stories/search-public-stories";
import { taxonomyTermPublicUrl } from "@/lib/taxonomy/public-url";
import { getChapterUrl, getStoryUrl } from "@/lib/urls/paths";
import type { TaxonomyType } from "@/types/taxonomy";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import type { SearchResultType } from "@/types/search";
import type { DatabaseClient } from "@/lib/db/types";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export type RawSearchCandidate = {
  resultType: SearchResultType;
  id: string;
  title: string;
  slug?: string | null;
  subtitle: string | null;
  description: string | null;
  href: string;
  imageUrl: string | null;
  storyId: string | null;
  storySlug: string | null;
  storyPublicCode?: string | null;
  authorUserId: string | null;
  authorUsername: string | null;
  authorDisplayName: string | null;
  episodeNumber: number | null;
  tags: string[];
  chapterTitle?: string | null;
  genreName?: string | null;
  genreSlug?: string | null;
  publishedAt?: string | null;
  contentOrigin?: "original" | "translation";
};

async function loadStoryTags(db: DatabaseClient, storyIds: string[]) {
  const map = new Map<string, string[]>();
  if (storyIds.length === 0) return map;

  const { getStoryTaxonomyLabelsByStoryIds } = await import(
    "@/lib/taxonomy/discover-bridge"
  );
  const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(db, storyIds);

  for (const [storyId, labels] of taxonomyByStory) {
    const names = [...labels.subgenreNames, ...labels.tagNames];
    if (names.length > 0) {
      map.set(storyId, names);
    }
  }

  return map;
}

export async function collectSearchCandidates(
  db: DatabaseClient,
  query: string,
  options?: { genre?: string }
): Promise<RawSearchCandidate[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const escaped = escapeIlikePattern(trimmed);
  const pattern = `%${escaped}%`;
  const candidates: RawSearchCandidate[] = [];

  const [ftsStoryIds, ftsEpisodeIds] = await Promise.all([
    searchPublicStoryIdsByFullText(db, trimmed, 60),
    searchPublicEpisodeIdsByFullText(db, trimmed, 40)
  ]);

  let storyQuery = db
    .from("stories")
    .select(
      "id, title, slug, public_code, hook, short_description, cover_url, published_at, content_origin, creator_profiles(id, user_id, pen_name, profiles!creator_profiles_user_id_fkey(display_name, username))"
    )
    .eq("visibility", "public")
    .in("status", [...publicContentStatuses])
    .limit(60);

  if (ftsStoryIds && ftsStoryIds.length > 0) {
    storyQuery = storyQuery.in("id", ftsStoryIds);
  } else {
    storyQuery = storyQuery.or(
      `title.ilike.${pattern},slug.ilike.${pattern},hook.ilike.${pattern},short_description.ilike.${pattern}`
    );
  }

  if (options?.genre) {
    const { getPublicStoryIdsForMainGenreSlug } = await import(
      "@/lib/taxonomy/public-genres"
    );
    const taxonomyStoryIds = await getPublicStoryIdsForMainGenreSlug(
      db,
      options.genre,
      200
    );
    if (taxonomyStoryIds && taxonomyStoryIds.length > 0) {
      storyQuery = storyQuery.in("id", taxonomyStoryIds);
    } else {
      return [];
    }
  }

  let episodeQuery = db
    .from("episodes")
    .select(
      "id, title, slug, public_code, episode_number, excerpt, plain_text_preview, published_at, stories!inner(id, title, slug, public_code, cover_url, content_origin, status, visibility, creator_profiles(id, user_id, pen_name, profiles!creator_profiles_user_id_fkey(display_name, username)))"
    )
    .in("status", [...publicContentStatuses])
    .in("stories.status", [...publicContentStatuses])
    .eq("stories.visibility", "public")
    .limit(40);

  if (ftsEpisodeIds && ftsEpisodeIds.length > 0) {
    episodeQuery = episodeQuery.in("id", ftsEpisodeIds);
  } else {
    episodeQuery = episodeQuery.or(
      `title.ilike.${pattern},excerpt.ilike.${pattern},plain_text_preview.ilike.${pattern}`
    );
  }

  const [storyRes, episodeRes, profileRes, postRes, tropeTagRes] = await Promise.all([
    storyQuery,
    episodeQuery,
    db
      .from("profiles")
      .select("id, username, display_name, avatar_url, status")
      .eq("status", "active")
      .not("username", "is", null)
      .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
      .limit(25),
    db
      .from("admin_content_posts")
      .select("id, title, slug, excerpt, cover_image_url, status, indexable")
      .eq("status", "published")
      .eq("indexable", true)
      .or(`title.ilike.${pattern},slug.ilike.${pattern},excerpt.ilike.${pattern}`)
      .limit(20),
    db
      .from("taxonomy_terms")
      .select("id, name, slug")
      .eq("type", "trope_tag")
      .eq("is_active", true)
      .eq("is_public", true)
      .eq("use_for_discover", true)
      .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
      .limit(15)
  ]);

  const storyRows = storyRes.data ?? [];
  const storyIds = storyRows.map((row) => row.id as string);

  const { getStoryTaxonomyLabelsByStoryIds } = await import(
    "@/lib/taxonomy/discover-bridge"
  );
  const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(db, storyIds);

  for (const row of storyRows) {
    const creator = firstRelation(
      row.creator_profiles as unknown as
        | {
            user_id: string | null;
            pen_name: string | null;
            profiles:
              | { username: string | null; display_name: string | null }
              | { username: string | null; display_name: string | null }[]
              | null;
          }
        | {
            user_id: string | null;
            pen_name: string | null;
            profiles:
              | { username: string | null; display_name: string | null }
              | { username: string | null; display_name: string | null }[]
              | null;
          }[]
        | null
    );
    const profile = firstRelation(creator?.profiles ?? null);
    const taxonomy = taxonomyByStory.get(row.id as string);
    const username = profile?.username?.trim().toLowerCase() ?? null;
    candidates.push({
      resultType: "story",
      id: row.id as string,
      title: row.title as string,
      slug: row.slug as string,
      subtitle: taxonomy?.mainGenreName ?? null,
      description: (row.hook as string | null) ?? (row.short_description as string | null),
      href: getStoryUrl({ slug: row.slug as string, public_code: row.public_code as string }),
      imageUrl: resolveStoryCoverUrl(row.cover_url as string | null),
      storyId: row.id as string,
      storySlug: row.slug as string,
      storyPublicCode: row.public_code as string,
      authorUserId: creator?.user_id ?? null,
      authorUsername: username,
      authorDisplayName: creator
        ? resolvePublicDisplayName(profile, creator)
        : null,
      episodeNumber: null,
      tags: [
        ...(taxonomy?.subgenreNames ?? []),
        ...(taxonomy?.tagNames ?? [])
      ].slice(0, 6),
      genreName: taxonomy?.mainGenreName ?? null,
      genreSlug: taxonomy?.mainGenreSlug ?? null,
      publishedAt: row.published_at as string | null
      ,
      contentOrigin:
        (row as { content_origin?: string | null }).content_origin === "translation"
          ? "translation"
          : "original"
    });
  }

  const episodeStoryIds = [
    ...new Set(
      (episodeRes.data ?? [])
        .map((episode) => {
          const story = firstRelation(
            episode.stories as unknown as { id: string } | { id: string }[] | null
          );
          return story?.id ?? null;
        })
        .filter((id): id is string => Boolean(id))
    )
  ];
  const episodeTaxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(
    db,
    episodeStoryIds
  );

  for (const episode of episodeRes.data ?? []) {
    const story = firstRelation(
      episode.stories as unknown as
        | {
            id: string;
            title: string;
            slug: string;
            public_code: string;
            cover_url: string | null;
            creator_profiles:
              | {
                  user_id: string | null;
                  pen_name: string | null;
                  profiles:
                    | { username: string | null; display_name: string | null }
                    | { username: string | null; display_name: string | null }[]
                    | null;
                }
              | {
                  user_id: string | null;
                  pen_name: string | null;
                  profiles:
                    | { username: string | null; display_name: string | null }
                    | { username: string | null; display_name: string | null }[]
                    | null;
                }[]
              | null;
          }
        | {
            id: string;
            title: string;
            slug: string;
            public_code: string;
            cover_url: string | null;
            creator_profiles:
              | {
                  user_id: string | null;
                  pen_name: string | null;
                  profiles:
                    | { username: string | null; display_name: string | null }
                    | { username: string | null; display_name: string | null }[]
                    | null;
                }
              | {
                  user_id: string | null;
                  pen_name: string | null;
                  profiles:
                    | { username: string | null; display_name: string | null }
                    | { username: string | null; display_name: string | null }[]
                    | null;
                }[]
              | null;
          }[]
        | null
    );
    if (!story) continue;
    const taxonomy = episodeTaxonomyByStory.get(story.id);
    const creator = firstRelation(story.creator_profiles);
    const profile = firstRelation(creator?.profiles ?? null);
    candidates.push({
      resultType: "chapter",
      id: episode.id as string,
      title: episode.title as string,
      slug: null,
      subtitle: story.title,
      description:
        (episode.plain_text_preview as string | null)?.slice(0, 200) ??
        (episode.excerpt as string | null),
      href: getChapterUrl(
        { slug: story.slug, public_code: story.public_code },
        { slug: episode.slug as string, public_code: episode.public_code as string }
      ),
      imageUrl: resolveStoryCoverUrl(story.cover_url),
      storyId: story.id,
      storySlug: story.slug,
      storyPublicCode: story.public_code,
      authorUserId: creator?.user_id ?? null,
      authorUsername: profile?.username?.trim().toLowerCase() ?? null,
      authorDisplayName: creator
        ? resolvePublicDisplayName(profile, creator)
        : null,
      episodeNumber: episode.episode_number as number,
      tags: [],
      chapterTitle: episode.title as string,
      genreName: taxonomy?.mainGenreName ?? null,
      genreSlug: taxonomy?.mainGenreSlug ?? null,
      publishedAt: episode.published_at as string | null
      ,
      contentOrigin:
        (story as { content_origin?: string | null }).content_origin === "translation"
          ? "translation"
          : "original"
    });
  }

  for (const profile of profileRes.data ?? []) {
    const username = (profile.username as string).trim().toLowerCase();
    const profileUrl = getProfileUrl(username);
    if (!profileUrl) continue;
    candidates.push({
      resultType: "author",
      id: profile.id as string,
      title: (profile.display_name as string) || username,
      slug: username,
      subtitle: `@${username}`,
      description: null,
      href: profileUrl,
      imageUrl: profileAvatarUrlFromRow({
        avatar_url: profile.avatar_url as string | null
      }),
      storyId: null,
      storySlug: null,
      authorUserId: profile.id as string,
      authorUsername: username,
      authorDisplayName: profile.display_name as string | null,
      episodeNumber: null,
      tags: []
    });
  }

  for (const post of postRes.data ?? []) {
    candidates.push({
      resultType: "content_post",
      id: post.id as string,
      title: post.title as string,
      slug: post.slug as string,
      subtitle: "Bài viết",
      description: post.excerpt as string | null,
      href: `/bai-viet/${post.slug}`,
      imageUrl: resolveStoredMediaUrl(post.cover_image_url as string | null),
      storyId: null,
      storySlug: null,
      authorUserId: null,
      authorUsername: null,
      authorDisplayName: null,
      episodeNumber: null,
      tags: [],
      publishedAt: null
    });
  }

  for (const tag of tropeTagRes.data ?? []) {
    const slug = String(tag.slug);
    const href = taxonomyTermPublicUrl("trope_tag", slug, true) ?? `/tag/${slug}`;
    candidates.push({
      resultType: "tag",
      id: tag.id as string,
      title: tag.name as string,
      slug,
      subtitle: "Tag truyện",
      description: null,
      href,
      imageUrl: null,
      storyId: null,
      storySlug: null,
      authorUserId: null,
      authorUsername: null,
      authorDisplayName: null,
      episodeNumber: null,
      tags: [tag.name as string]
    });
  }

  const { data: taxonomyGenreRes } = await db
    .from("taxonomy_terms")
    .select("id, name, slug, description")
    .eq("type", "main_genre")
    .eq("is_active", true)
    .eq("is_public", true)
    .or(`name.ilike.${pattern},slug.ilike.${pattern},description.ilike.${pattern}`)
    .limit(10);

  const seenGenreSlugs = new Set<string>();

  for (const genre of taxonomyGenreRes ?? []) {
    const slug = String(genre.slug);
    if (seenGenreSlugs.has(slug)) continue;
    seenGenreSlugs.add(slug);
    candidates.push({
      resultType: "category",
      id: String(genre.id),
      title: String(genre.name),
      slug,
      subtitle: "Thể loại",
      description: genre.description ? String(genre.description) : null,
      href: `/the-loai/${slug}`,
      imageUrl: null,
      storyId: null,
      storySlug: null,
      authorUserId: null,
      authorUsername: null,
      authorDisplayName: null,
      episodeNumber: null,
      tags: [],
      genreName: String(genre.name),
      genreSlug: slug
    });
  }

  const taxonomySearchTypes: Array<{ type: TaxonomyType; subtitle: string }> = [
    { type: "trope_tag", subtitle: "Tag truyện" },
    { type: "setting_tag", subtitle: "Bối cảnh" },
    { type: "reader_experience", subtitle: "Cảm giác đọc" },
    { type: "presentation_mode", subtitle: "Định dạng" },
    { type: "subgenre", subtitle: "Thể loại phụ" },
    { type: "content_type", subtitle: "Loại truyện" },
    { type: "character_tag", subtitle: "Nhân vật" },
    { type: "content_warning", subtitle: "Cảnh báo" },
    { type: "age_rating", subtitle: "Độ tuổi" }
  ];

  const taxonomyTermResults = await Promise.all(
    taxonomySearchTypes.map(({ type }) =>
      db
        .from("taxonomy_terms")
        .select("id, name, slug, description")
        .eq("type", type)
        .eq("is_active", true)
        .eq("is_public", true)
        .eq("use_for_discover", true)
        .or(`name.ilike.${pattern},slug.ilike.${pattern},description.ilike.${pattern}`)
        .limit(8)
    )
  );

  taxonomySearchTypes.forEach(({ type, subtitle }, index) => {
    const terms = taxonomyTermResults[index]?.data ?? [];
    for (const term of terms) {
      const slug = String(term.slug);
      const href = taxonomyTermPublicUrl(type, slug, true);
      if (!href) continue;
      candidates.push({
        resultType: "tag",
        id: String(term.id),
        title: String(term.name),
        slug,
        subtitle,
        description: term.description ? String(term.description) : null,
        href,
        imageUrl: null,
        storyId: null,
        storySlug: null,
        authorUserId: null,
        authorUsername: null,
        authorDisplayName: null,
        episodeNumber: null,
        tags: [String(term.name)]
      });
    }
  });

  return candidates;
}
