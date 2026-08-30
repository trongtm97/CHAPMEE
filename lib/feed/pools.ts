import type { DatabaseClient } from "@/lib/db/types";
import {
  fetchReelCatalogCandidates,
  fetchStoryCatalogCandidates,
  filterCandidates,
  sortByScore,
  tagPool
} from "@/lib/feed/catalog";
import {
  loadFollowedCreatorIds,
  loadUserInterestProfile,
  personalFitForCandidate
} from "@/lib/feed/interest";
import { mixCandidatePools } from "@/lib/feed/mixer";
import {
  createReelsShuffleSeed,
  interleaveReelsByStory,
  REELS_DIVERSITY_RULES,
  shuffleReelsFeedCandidates
} from "@/lib/feed/reels-session-shuffle";
import { enforceFeedDiversity } from "@/lib/fairness/diversity";
import { applyFairnessGuardPipeline } from "@/lib/fairness/pipeline";
import {
  getColdStartCandidates,
  getQualifiedGrowthCandidates
} from "@/lib/cold-start/candidates";
import {
  countCandidatesByPool,
  logAlgorithmFeedRequest,
  REELS_FEED_BATCH_LIMIT
} from "@/lib/feed/request-log";
import { getFairDistributionConfig } from "@/lib/fair-distribution/settings";
import { loadTaxonomyExposureShare } from "@/lib/fair-distribution/load-taxonomy-context";
import { getAlgorithmVersion, getPoolWeightsForSurface, normalizePoolWeights } from "@/lib/feed/weights";
import {
  applyContentOriginFairnessQuota,
  loadContentOriginMixSettings
} from "@/lib/algorithm/content-origin-mix";
import type {
  CandidatePools,
  FeedCandidate,
  FeedMixerContext,
  FeedSurface,
  PoolWeights
} from "@/types/feed-mixer";
import { randomUUID } from "crypto";

const MS_DAY = 24 * 60 * 60 * 1000;

function daysSince(iso: string | null) {
  if (!iso) return 999;
  return (Date.now() - new Date(iso).getTime()) / MS_DAY;
}

function median(values: number[]) {
  if (values.length === 0) return 0.35;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function genreQualityMedian(catalog: FeedCandidate[]) {
  const byGenre = new Map<string, number[]>();
  for (const item of catalog) {
    const key = item.genreSlug ?? "_none";
    byGenre.set(key, [...(byGenre.get(key) ?? []), item.qualityScore]);
  }
  const medians = new Map<string, number>();
  for (const [genre, scores] of byGenre) {
    medians.set(genre, median(scores));
  }
  return medians;
}

function authorExposureCounts(catalog: FeedCandidate[]) {
  const counts = new Map<string, number>();
  for (const item of catalog) {
    counts.set(item.authorUserId, (counts.get(item.authorUserId) ?? 0) + 1);
  }
  return counts;
}

function diverseQualityFallback(catalog: FeedCandidate[], limit: number) {
  const usedAuthors = new Set<string>();
  const picked: FeedCandidate[] = [];
  const sorted = sortByScore(catalog, (c) => c.qualityScore);

  for (const item of sorted) {
    if (picked.length >= limit) break;
    if (usedAuthors.has(item.authorUserId) && usedAuthors.size < 12) continue;
    usedAuthors.add(item.authorUserId);
    picked.push(item);
  }

  return picked.length >= limit ? picked : sorted.slice(0, limit);
}

export async function buildCandidatePools(
  db: DatabaseClient,
  context: FeedMixerContext,
  catalog: FeedCandidate[]
): Promise<CandidatePools> {
  const filtered = filterCandidates(catalog, {
    excludeKeys: context.excludeKeys,
    recentlySeenKeys: context.recentlySeenKeys,
    // Reels: deprioritize seen items in rerank — do not drop them from the catalog,
    // otherwise a single story with many unseen chapters dominates the feed.
    skipRecent: false,
    genreSlug: context.genreSlug ?? context.categorySlug ?? null
  });

  const [profile, followedCreators, coldStartItems, qualifiedGrowth, fdsConfig, taxonomyShare] =
    await Promise.all([
    loadUserInterestProfile(db, context.userId),
    loadFollowedCreatorIds(db, context.userId),
    getColdStartCandidates(db, context.surface, 35),
    getQualifiedGrowthCandidates(db, context.surface, 25),
    getFairDistributionConfig(),
    loadTaxonomyExposureShare(db, context.surface, 7)
  ]);

  const genreMedians = genreQualityMedian(filtered);
  const authorCounts = authorExposureCounts(filtered);

  const personalized = sortByScore(filtered, (c) => {
    const fit = personalFitForCandidate(c, profile);
    return fit * 0.55 + c.qualityScore * 0.25 + c.mixerScore * 0.2;
  }).slice(0, 80);

  const personalizedFallback = profile
    ? personalized
    : diverseQualityFallback(filtered, 40);

  const trending_quality = sortByScore(filtered, (c) => {
    return c.discoveryScore * 0.45 + c.freshnessScore * 0.35 + c.qualityScore * 0.2;
  }).slice(0, 60);

  const fresh = sortByScore(
    filtered.filter((c) => daysSince(c.publishedAt) <= 14),
    (c) => c.freshnessScore * 0.6 + c.mixerScore * 0.4
  ).slice(0, 50);

  const new_author = sortByScore(
    filtered.filter((c) => {
      const authorStories = authorCounts.get(c.authorUserId) ?? 0;
      return authorStories <= 2 && daysSince(c.publishedAt) <= 60;
    }),
    (c) => c.discoveryScore * 0.5 + c.qualityScore * 0.5
  ).slice(0, 40);

  const under_exposed = sortByScore(
    filtered.filter((c) => {
      const genreKey = c.mainGenreTermId ?? c.genreSlug ?? "_none";
      const genreMedian = genreMedians.get(c.genreSlug ?? "_none") ?? 0.35;
      const taxonomySharePct = taxonomyShare.get(genreKey) ?? 0;
      const isColdTaxonomy =
        taxonomySharePct < fdsConfig.caps.minColdTaxonomySharePercent;
      return (
        c.qualityScore >= genreMedian &&
        c.discoveryScore >= 0.4 &&
        (c.freshnessScore < 0.55 || isColdTaxonomy)
      );
    }),
    (c) => {
      const genreKey = c.mainGenreTermId ?? c.genreSlug ?? "_none";
      const taxonomySharePct = taxonomyShare.get(genreKey) ?? 0;
      const coldBoost =
        taxonomySharePct < fdsConfig.caps.minColdTaxonomySharePercent ? 0.15 : 0;
      return (
        c.qualityScore * 0.5 + c.discoveryScore * 0.5 - c.freshnessScore * 0.15 + coldBoost
      );
    }
  ).slice(0, 50);

  const long_tail_quality = sortByScore(
    filtered.filter((c) => {
      const age = daysSince(c.publishedAt);
      return age >= 21 && age <= 400 && c.qualityScore >= 0.42 && c.discoveryScore < 0.72;
    }),
    (c) => c.qualityScore * 0.65 + c.mixerScore * 0.35
  ).slice(0, 50);

  const followed_author = sortByScore(
    filtered.filter((c) => c.creatorId && followedCreators.has(c.creatorId)),
    (c) => c.freshnessScore * 0.55 + c.mixerScore * 0.45
  ).slice(0, 40);

  const category = context.genreSlug
    ? sortByScore(
        filtered.filter((c) => c.genreSlug === context.genreSlug),
        (c) => c.mixerScore
      ).slice(0, 40)
    : [];

  const growing = [
    ...qualifiedGrowth,
    ...sortByScore(filtered, (c) => {
      return c.discoveryScore * 0.45 + c.freshnessScore * 0.35 + c.qualityScore * 0.2;
    }).slice(0, 45)
  ].slice(0, 50);
  const completed_story = sortByScore(
    filtered.filter((c) => c.itemType === "story" && c.isCompleted),
    (c) => c.qualityScore * 0.7 + c.mixerScore * 0.3
  ).slice(0, 35);

  const admin_boost: FeedCandidate[] = [];
  const original_pool = sortByScore(
    filtered.filter((c) => c.contentOrigin !== "translation"),
    (c) => c.mixerScore
  ).slice(0, 90);
  const translation_pool = sortByScore(
    filtered.filter((c) => c.contentOrigin === "translation"),
    (c) => c.mixerScore
  ).slice(0, 90);
  const mixed_pool = sortByScore(filtered, (c) => c.mixerScore).slice(0, 120);

  return {
    personalized: tagPool(personalizedFallback, "personalized"),
    trending_quality: tagPool(trending_quality, "trending_quality"),
    fresh: tagPool(fresh.length > 0 ? fresh : filtered.slice(0, 40), "fresh"),
    new_author: tagPool(new_author, "new_author"),
    under_exposed: tagPool(under_exposed, "under_exposed"),
    long_tail_quality: tagPool(long_tail_quality, "long_tail_quality"),
    followed_author: tagPool(followed_author, "followed_author"),
    category: tagPool(category, "category"),
    admin_boost: tagPool(admin_boost, "admin_boost"),
    growing: tagPool(growing, "growing"),
    completed_story: tagPool(completed_story, "completed_story"),
    cold_start: tagPool(coldStartItems, "cold_start"),
    original_pool: tagPool(original_pool, "original_pool"),
    translation_pool: tagPool(translation_pool, "translation_pool"),
    mixed_pool: tagPool(mixed_pool, "mixed_pool")
  };
}

export async function getCandidatesForSurface(
  db: DatabaseClient,
  surface: FeedSurface,
  userId: string | null,
  context: Omit<FeedMixerContext, "surface" | "userId"> & {
    limit: number;
    requestId?: string;
    shuffleSeed?: number;
  }
) {
  const requestId = context.requestId ?? randomUUID();
  const algorithmVersion = await getAlgorithmVersion();
  const weights = normalizePoolWeights(await getPoolWeightsForSurface(surface));
  const shuffleSeed =
    surface === "reels"
      ? (context.shuffleSeed ?? createReelsShuffleSeed())
      : undefined;

  const mixerContext: FeedMixerContext = {
    surface,
    userId,
    shuffleSeed,
    ...context
  };

  const catalog =
    surface === "reels"
      ? await fetchReelCatalogCandidates(db, 280)
      : await fetchStoryCatalogCandidates(db, 220);

  const pools = await buildCandidatePools(db, mixerContext, catalog);
  const mixed = mixCandidatePools(pools, weights, context.limit, { shuffleSeed });
  const reelsRerankRules = {
    excludeKeys: context.excludeKeys,
    deprioritizeSeenKeys: context.recentlySeenKeys,
    maxConsecutiveSameAuthor: REELS_DIVERSITY_RULES.maxConsecutiveSameAuthor,
    maxConsecutiveSameStory:
      surface === "reels" ? REELS_DIVERSITY_RULES.maxConsecutiveSameStory : undefined,
    maxSameStoryInWindow:
      surface === "reels" ? REELS_DIVERSITY_RULES.maxSameStoryInWindow : 3,
    storyWindowSize:
      surface === "reels" ? REELS_DIVERSITY_RULES.storyWindowSize : 30
  };

  const guarded = await applyFairnessGuardPipeline(db, {
    surface,
    items: mixed,
    pools,
    limit: context.limit,
    requestId,
    rerankRules: reelsRerankRules
  });
  const mixSettings = await loadContentOriginMixSettings();
  const mixedWithOriginCap = applyContentOriginFairnessQuota(guarded, {
    surface,
    limit: context.limit,
    settings: mixSettings
  });

  const batchCap =
    surface === "reels"
      ? Math.min(
          REELS_FEED_BATCH_LIMIT,
          Math.max(context.limit * 2, context.limit + 40)
        )
      : Math.max(context.limit * 2, context.limit + 40);
  const batchPool = mixedWithOriginCap.items.slice(0, batchCap);
  let deliverable = batchPool.slice(0, batchCap);
  if (surface === "reels" && shuffleSeed != null) {
    const shuffled = shuffleReelsFeedCandidates(batchPool, shuffleSeed);
    const interleaved = interleaveReelsByStory(shuffled);
    deliverable = enforceFeedDiversity(interleaved, {
      rerankRules: reelsRerankRules,
      targetLength: batchCap,
      preservePlacementOrder: true
    }).slice(0, batchCap);
  }

  void logAlgorithmFeedRequest(db, {
    requestId,
    userId,
    surface,
    algorithmVersion,
    poolConfig: weights,
    pools,
    selectedItems: deliverable
  });

  return {
    requestId,
    algorithmVersion,
    weights,
    pools,
    poolCounts: {
      ...countCandidatesByPool(pools),
      ...(mixedWithOriginCap.reasons.length > 0
        ? { origin_mix_notes: mixedWithOriginCap.reasons.length }
        : {}),
      ...(shuffleSeed != null ? { reels_shuffle_seed: 1 } : {})
    },
    candidates: deliverable,
    shuffleSeed
  };
}
