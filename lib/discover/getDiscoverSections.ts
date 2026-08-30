import {
  dedupeDiscoverItemsAcrossSections,
  mergeSectionStories,
  pickSectionCandidates,
  type DiscoverSectionDraft
} from "@/lib/discover/dedupe-sections";
import type {
  DiscoverCreatorSpotlight,
  DiscoverData,
  DiscoverGenre,
  DiscoverStory
} from "@/lib/discover/getDiscoverData";
import { getTagsByStory } from "@/lib/discover/tags";
import { fetchStoryCatalogCandidates } from "@/lib/feed/catalog";
import { enrichDiscoverCandidates } from "@/lib/feed/enrich-discover";
import { loadUserFeedExclusions } from "@/lib/feed/exclusions";
import { loadUserInterestProfile, personalFitForCandidate } from "@/lib/feed/interest";
import { getCandidatesForSurface } from "@/lib/feed/pools";
import { enforceFeedDiversity } from "@/lib/fairness/diversity";
import { getRankingBoard } from "@/lib/ranking/get-board";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import { loadTaxonomyExposureShare } from "@/lib/fair-distribution/load-taxonomy-context";
import { getFairDistributionConfig } from "@/lib/fair-distribution/settings";
import { createClient } from "@/lib/data/server";
import { createPublicClient } from "@/lib/data/public-client";
import {
  ANONYMOUS_RECOMMENDED_POOLS,
  DISCOVER_SECTION_CONFIG,
  type DiscoverSectionConfig,
  type DiscoverSectionKey
} from "@/types/discover-sections";
import type { FeedCandidate, CandidatePoolId } from "@/types/feed-mixer";
import type { RankingBoardItem } from "@/types/ranking-board";

export type DiscoverSectionView = DiscoverSectionConfig & {
  stories: DiscoverStory[];
  creators: DiscoverCreatorSpotlight[];
};

function rankingItemToDiscoverStory(item: RankingBoardItem): DiscoverStory | null {
  if (item.itemType !== "story" || !item.slug) return null;

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    publicCode: item.publicCode ?? "",
    coverUrl: resolveStoryCoverUrl(item.coverUrl),
    hook: item.description,
    shortDescription: item.description,
    longDescription: null,
    genreName: item.genreName,
    genreSlug: item.genreSlug ?? null,
    creatorName: item.authorDisplayName,
    creatorUsername: item.authorUsername?.trim().toLowerCase() ?? null,
    creatorUserId: null,
    isCompleted: false,
    publishedAt: null,
    tagNames: [],
    score: item.score,
    contentOrigin: "original",
    rightsStatus: null,
    feed: {
      requestId: "ranking-snapshot",
      algorithmVersion: "ranking",
      candidatePool: "trending_quality",
      rankPosition: item.rank,
      sectionKey: "ranking_today"
    }
  };
}

function buildCreatorsFromStories(stories: DiscoverStory[]): DiscoverCreatorSpotlight[] {
  const map = new Map<string, DiscoverCreatorSpotlight>();

  for (const story of stories) {
    const key = story.creatorUsername ?? story.creatorName ?? story.id;
    const existing = map.get(key);
    if (existing) {
      existing.storyCount += 1;
      continue;
    }
    map.set(key, {
      id: key,
      displayName: story.creatorName ?? "Tác giả ChapMee",
      username: story.creatorUsername,
      storyCount: 1
    });
  }

  return [...map.values()].slice(0, 6);
}

async function loadGenres(): Promise<DiscoverGenre[]> {
  const db = createPublicClient();
  const { loadDiscoverGenresFromTaxonomy } = await import(
    "@/lib/taxonomy/discover-bridge"
  );
  return loadDiscoverGenresFromTaxonomy(db);
}

async function loadRankingStories(limit: number): Promise<DiscoverStory[]> {
  const db = createPublicClient();
  const board = await getRankingBoard(db, {
    boardType: "top_stories",
    timeWindow: "day",
    pageSize: limit
  });

  return board.items
    .map(rankingItemToDiscoverStory)
    .filter(Boolean) as DiscoverStory[];
}

async function loadDiscoverCandidatePool(
  userId: string | null,
  genreSlug: string | null
) {
  const db = userId ? await createClient() : createPublicClient();
  const { excludeKeys, recentlySeenKeys } = await loadUserFeedExclusions(
    db,
    userId
  );

  try {
    const mixed = await getCandidatesForSurface(db, "discover", userId, {
      limit: 220,
      genreSlug: genreSlug ?? undefined,
      excludeKeys,
      recentlySeenKeys
    });

    return {
      db,
      candidates: mixed.candidates,
      requestId: mixed.requestId,
      algorithmVersion: mixed.algorithmVersion,
      poolCounts: mixed.poolCounts,
      error: null as string | null
    };
  } catch (error) {
    const catalog = await fetchStoryCatalogCandidates(db, 180);
    const filtered = catalog.filter((candidate) => {
      if (genreSlug && candidate.genreSlug !== genreSlug) return false;
      const key = `${candidate.itemType}:${candidate.itemId}`;
      if (excludeKeys.has(key)) return false;
      return true;
    });

    const diversified = enforceFeedDiversity(filtered, {
      targetLength: 120,
      rerankRules: { maxConsecutiveSameAuthor: 1, maxSameStoryInWindow: 3 }
    });

    return {
      db,
      candidates: diversified.map((candidate) => ({
        ...candidate,
        pool: candidate.pool ?? ("fresh" as CandidatePoolId)
      })),
      requestId: "discover-fallback",
      algorithmVersion: "fallback",
      poolCounts: { fallback: diversified.length },
      error: error instanceof Error ? error.message : "Mixer fallback"
    };
  }
}

function scoreForSection(
  candidate: FeedCandidate,
  sectionKey: DiscoverSectionKey,
  userId: string | null,
  profileFit: number,
  taxonomyShare: Map<string, number>,
  minColdTaxonomyShare: number
) {
  if (sectionKey === "underexposed_genres") {
    const genreKey = candidate.mainGenreTermId ?? candidate.genreSlug ?? "_none";
    const share = taxonomyShare.get(genreKey) ?? 0;
    const coldBoost =
      share < minColdTaxonomyShare
        ? 0.25 + (minColdTaxonomyShare - share) / 100
        : 0;
    return (
      candidate.qualityScore * 0.45 +
      candidate.discoveryScore * 0.35 +
      coldBoost +
      candidate.mixerScore * 0.2
    );
  }
  if (sectionKey === "trending_in_taste") {
    return candidate.discoveryScore * 0.45 + profileFit * 0.35 + candidate.qualityScore * 0.2;
  }
  if (sectionKey === "recommended") {
    return userId
      ? profileFit * 0.55 + candidate.qualityScore * 0.25 + candidate.mixerScore * 0.2
      : candidate.qualityScore * 0.5 + candidate.discoveryScore * 0.3 + candidate.freshnessScore * 0.2;
  }
  return candidate.mixerScore;
}

export async function getDiscoverSection(
  sectionKey: DiscoverSectionKey,
  userId: string | null,
  limit = 8,
  genreSlug: string | null = null
): Promise<DiscoverSectionView | null> {
  const config = DISCOVER_SECTION_CONFIG.find((section) => section.key === sectionKey);
  if (!config) return null;

  const sections = await getDiscoverSections(userId, { genre: genreSlug ?? "" });
  const match = sections.sections.find((section) => section.key === sectionKey);
  if (!match) return null;

  return {
    ...config,
    stories: match.stories.slice(0, limit),
    creators: match.creators.slice(0, limit)
  };
}

export async function getDiscoverSections(
  userId: string | null,
  params: { query?: string; genre?: string } = {}
): Promise<DiscoverData> {
  const genreSlug = params.genre?.trim() || null;
  const query = params.query?.trim().toLowerCase() ?? "";

  try {
    const [genres, pool, fdsConfig] = await Promise.all([
      loadGenres(),
      loadDiscoverCandidatePool(userId, genreSlug),
      getFairDistributionConfig()
    ]);
    const taxonomyShare = await loadTaxonomyExposureShare(pool.db, "discover", 7);

    const profile = await loadUserInterestProfile(pool.db, userId);
    const profileFitByStory = new Map<string, number>();
    for (const candidate of pool.candidates) {
      profileFitByStory.set(
        candidate.storyId,
        personalFitForCandidate(candidate, profile)
      );
    }

    const usedStoryIds = new Set<string>();
    const globalAuthorCounts = new Map<string, number>();
    const drafts: DiscoverSectionDraft[] = [];

    for (const config of DISCOVER_SECTION_CONFIG) {
      if (config.key === "ranking_today") continue;

      const pools =
        config.key === "recommended" && !userId
          ? ANONYMOUS_RECOMMENDED_POOLS
          : config.pools;

      const sectionCandidates = pickSectionCandidates(
        pool.candidates.map((candidate) => ({
          ...candidate,
          mixerScore: scoreForSection(
            candidate,
            config.key,
            userId,
            profileFitByStory.get(candidate.storyId) ?? 0.45,
            taxonomyShare,
            fdsConfig.caps.minColdTaxonomySharePercent
          )
        })),
        pools,
        config.limit,
        usedStoryIds,
        globalAuthorCounts
      );

      drafts.push({
        key: config.key,
        candidates: sectionCandidates,
        limit: config.limit
      });
    }

    const uniqueCandidates = new Map<string, FeedCandidate>();
    for (const draft of drafts) {
      for (const candidate of draft.candidates) {
        uniqueCandidates.set(candidate.storyId, candidate);
      }
    }

    const storyIds = [...uniqueCandidates.keys()];
    const tagsByStory = await getTagsByStory(storyIds);
    const enriched = await enrichDiscoverCandidates(
      pool.db,
      [...uniqueCandidates.values()],
      {
        requestId: pool.requestId,
        algorithmVersion: pool.algorithmVersion
      },
      tagsByStory
    );

    const storyById = new Map(
      enriched.map((story, index) => {
        const candidate = uniqueCandidates.get(story.id);
        return [
          story.id,
          {
            ...story,
            feed: {
              requestId: pool.requestId,
              algorithmVersion: pool.algorithmVersion,
              candidatePool: candidate?.pool ?? story.feed?.candidatePool ?? "personalized",
              rankPosition: index
            }
          } as DiscoverStory
        ];
      })
    );

    for (const draft of drafts) {
      for (let index = 0; index < draft.candidates.length; index += 1) {
        const story = storyById.get(draft.candidates[index].storyId);
        if (!story?.feed) continue;
        story.feed = {
          ...story.feed,
          requestId: pool.requestId,
          algorithmVersion: pool.algorithmVersion,
          sectionKey: draft.key,
          rankPosition: index,
          candidatePool: draft.candidates[index].pool
        };
      }
    }

    let sectionResults = mergeSectionStories(drafts, storyById);
    sectionResults = dedupeDiscoverItemsAcrossSections(sectionResults);

    const rankingStories = await loadRankingStories(5);

    const sections: DiscoverSectionView[] = DISCOVER_SECTION_CONFIG.map((config) => {
      if (config.key === "ranking_today") {
        return {
          ...config,
          stories: rankingStories,
          creators: []
        };
      }

      if (config.key === "new_authors") {
        const sectionStories =
          sectionResults.find((section) => section.key === config.key)?.stories ?? [];
        return {
          ...config,
          stories: sectionStories,
          creators: buildCreatorsFromStories(sectionStories)
        };
      }

      const baseSectionStories: DiscoverSectionView = {
        ...config,
        stories: sectionResults.find((section) => section.key === config.key)?.stories ?? [],
        creators: []
      };

      if (config.key === "featured_originals" || config.key === "top_originals") {
        return {
          ...baseSectionStories,
          stories: baseSectionStories.stories
            .filter((story) => story.contentOrigin !== "translation")
            .slice(0, config.limit)
        };
      }
      if (config.key === "free_translations" || config.key === "top_translations") {
        return {
          ...baseSectionStories,
          stories: baseSectionStories.stories
            .filter((story) => story.contentOrigin === "translation")
            .slice(0, config.limit)
        };
      }
      if (config.key === "recommended_boosted") {
        const boosted = baseSectionStories.stories
          .filter((story) => story.feed?.candidatePool === "admin_boost")
          .slice(0, Math.max(2, Math.floor(config.limit * 0.35)));
        const organic = baseSectionStories.stories
          .filter((story) => story.feed?.candidatePool !== "admin_boost")
          .slice(0, config.limit - boosted.length);
        return {
          ...baseSectionStories,
          stories: [...boosted, ...organic].slice(0, config.limit)
        };
      }
      return baseSectionStories;
    }).filter(
      (section) =>
        section.stories.length > 0 || (section.variant === "creators" && section.creators.length > 0)
    );

    const allStories = sections.flatMap((section) => section.stories);
    const filteredSearchResults =
      query || genreSlug
        ? allStories.filter((story) => {
            if (genreSlug && story.genreSlug !== genreSlug) return false;
            if (!query) return true;
            const haystack = [
              story.title,
              story.hook,
              story.shortDescription,
              story.genreName,
              ...story.tagNames
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            return haystack.includes(query);
          })
        : [];

    const { enrichDiscoverStories } = await import("@/src/lib/audio/audio-summary");
    const enrichedSections = await Promise.all(
      sections.map(async (section) => ({
        ...section,
        stories: await enrichDiscoverStories(section.stories)
      }))
    );
    const searchResults = await enrichDiscoverStories(filteredSearchResults);

    return {
      genres,
      searchResults,
      sections: enrichedSections,
      latestUpdates: [],
      taxonomy: null,
      requestId: pool.requestId,
      algorithmVersion: pool.algorithmVersion,
      poolCounts: pool.poolCounts,
      error: pool.error,
      filmTab: null
    };
  } catch (error) {
    return {
      genres: [],
      searchResults: [],
      sections: [],
      latestUpdates: [],
      taxonomy: null,
      requestId: null,
      algorithmVersion: null,
      poolCounts: {},
      error: error instanceof Error ? error.message : "Could not load discover sections.",
      filmTab: null
    };
  }
}

export { dedupeDiscoverItemsAcrossSections } from "@/lib/discover/dedupe-sections";
