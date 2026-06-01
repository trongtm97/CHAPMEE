import { createPublicClient } from "@/lib/supabase/public-client";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import {
  getCachedDiscoverTaxonomyTerms
} from "@/lib/taxonomy/cache";
import { taxonomyTermPublicUrl } from "@/lib/taxonomy/public-url";
import { getPublicStoryIdsForTaxonomyTerm } from "@/lib/discovery/resolve-catalog-story-ids";
import type {
  DiscoverTaxonomyChipSection,
  DiscoverTaxonomyPayload,
  DiscoverTaxonomyStorySection
} from "@/lib/discovery/types";
import { enrichCatalogStories } from "@/lib/discovery/enrich-catalog-stories";
import type { TaxonomyType } from "@/types/taxonomy";
import type { StoryCatalogStory } from "@/types/story";

const STORY_SECTION_TYPES: TaxonomyType[] = ["main_genre", "reader_experience", "presentation_mode"];

const CHIP_SECTION_TYPE = {
  genres: "main_genre",
  experiences: "reader_experience",
  settings: "setting_tag",
  presentations: "presentation_mode"
} as const;

function chipSection(
  key: keyof typeof CHIP_SECTION_TYPE,
  title: string,
  seeAllPath: string,
  terms: Array<{ id: string; name: string; slug: string; description: string | null }>
): DiscoverTaxonomyChipSection {
  const type = CHIP_SECTION_TYPE[key];
  return {
    key,
    title,
    seeAllHref: seeAllPath,
    terms: terms
      .map((term) => {
        const href = taxonomyTermPublicUrl(type, term.slug, true);
        if (!href) return null;
        return {
          id: term.id,
          name: term.name,
          slug: term.slug,
          description: term.description,
          href
        };
      })
      .filter((term): term is NonNullable<typeof term> => Boolean(term))
  };
}

async function loadStoriesForTerm(
  type: TaxonomyType,
  slug: string,
  limit: number,
  excludeIds: Set<string>
): Promise<StoryCatalogStory[]> {
  const supabase = createPublicClient();
  const storyIds = await getPublicStoryIdsForTaxonomyTerm(supabase, type, slug, 80);
  const filtered = storyIds.filter((id) => !excludeIds.has(id)).slice(0, limit);
  if (filtered.length === 0) return [];

  const { data, error } = await supabase
    .from("stories")
    .select(
      "id, title, slug, public_code, hook, short_description, cover_url, published_at, is_completed, creator_profiles(pen_name, profiles(display_name, username))"
    )
    .in("id", filtered)
    .eq("visibility", "public")
    .in("status", ["published", "approved"])
    .order("published_at", { ascending: false });

  if (error || !data?.length) return [];

  const labels = await getStoryTaxonomyLabelsByStoryIds(supabase, filtered);
  const stories = enrichCatalogStories(
    (data ?? []).map((row) => {
      const creator = Array.isArray(row.creator_profiles)
        ? row.creator_profiles[0]
        : row.creator_profiles;
      const profile = Array.isArray(creator?.profiles)
        ? creator?.profiles[0]
        : creator?.profiles;
      const taxonomy = labels.get(String(row.id));
      return {
        id: String(row.id),
        title: String(row.title),
        slug: String(row.slug),
        publicCode: String(row.public_code),
        hook: (row.hook as string | null) ?? null,
        shortDescription: (row.short_description as string | null) ?? null,
        coverUrl: (row.cover_url as string | null) ?? null,
        creatorName:
          (profile?.display_name as string | null) ??
          (creator?.pen_name as string | null) ??
          null,
        creatorUsername: (profile?.username as string | null)?.toLowerCase() ?? null,
        genreName: taxonomy?.mainGenreName ?? null,
        genreSlug: taxonomy?.mainGenreSlug ?? null,
        publishedAt: (row.published_at as string | null) ?? null,
        isCompleted: Boolean(row.is_completed),
        score: 0,
        tagPreview: taxonomy?.tagNames.slice(0, 3) ?? []
      };
    })
  );

  for (const story of stories) {
    excludeIds.add(story.id);
  }

  return stories;
}

export async function getDiscoverTaxonomySections(): Promise<DiscoverTaxonomyPayload> {
  const [genres, experiences, settings, presentations] = await Promise.all([
    getCachedDiscoverTaxonomyTerms("main_genre", { limit: 12 }),
    getCachedDiscoverTaxonomyTerms("reader_experience", { limit: 10 }),
    getCachedDiscoverTaxonomyTerms("setting_tag", { limit: 10, orderBy: "usage_count" }),
    getCachedDiscoverTaxonomyTerms("presentation_mode", { limit: 8 })
  ]);

  const featuredGenres = chipSection(
    "genres",
    "Thể loại nổi bật",
    "/the-loai",
    genres
  );
  const readerExperiences = chipSection(
    "experiences",
    "Đọc theo cảm giác",
    "/cam-giac",
    experiences
  );
  const settingTags = chipSection(
    "settings",
    "Bối cảnh được quan tâm",
    "/boi-canh",
    settings
  );
  const presentationModes = chipSection(
    "presentations",
    "Format truyện đặc biệt",
    "/dinh-dang",
    presentations
  );

  const storySections: DiscoverTaxonomyStorySection[] = [];
  const usedStoryIds = new Set<string>();
  const sectionTerms = [
    ...genres.slice(0, 2).map((t) => ({ term: t, type: "main_genre" as const })),
    ...experiences.slice(0, 2).map((t) => ({
      term: t,
      type: "reader_experience" as const
    })),
    ...presentations.slice(0, 2).map((t) => ({
      term: t,
      type: "presentation_mode" as const
    }))
  ].filter((item) => STORY_SECTION_TYPES.includes(item.type));

  const sectionResults = await Promise.all(
    sectionTerms.map(({ term, type }) =>
      loadStoriesForTerm(type, term.slug, 8, usedStoryIds).then((stories) => ({
        term,
        type,
        stories
      }))
    )
  );

  for (const { term, type, stories } of sectionResults) {
    if (stories.length === 0) continue;
    const href = taxonomyTermPublicUrl(type, term.slug, true) ?? "/truyen";
    storySections.push({
      key: `${type}-${term.slug}`,
      title: `Truyện ${term.name}`,
      termSlug: term.slug,
      termType: type,
      seeAllHref: href,
      stories
    });
  }

  return {
    featuredGenres,
    readerExperiences,
    settingTags,
    presentationModes,
    storySections
  };
}

export async function getFeaturedTaxonomyTermsForDiscover(
  type: TaxonomyType,
  limit = 12
) {
  const terms = await getCachedDiscoverTaxonomyTerms(type, { limit });
  return { data: terms, error: null };
}
