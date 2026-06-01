import type { SupabaseClient } from "@supabase/supabase-js";
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
import { applyFairnessGuardPipeline } from "@/lib/fairness/pipeline";
import {
  getColdStartCandidates,
  getQualifiedGrowthCandidates
} from "@/lib/cold-start/candidates";
import {
  countCandidatesByPool,
  logAlgorithmFeedRequest
} from "@/lib/feed/request-log";
import { getFairDistributionConfig } from "@/lib/fair-distribution/settings";
import { loadTaxonomyExposureShare } from "@/lib/fair-distribution/load-taxonomy-context";
import { getAlgorithmVersion, getPoolWeightsForSurface, normalizePoolWeights } from "@/lib/feed/weights";
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
  supabase: SupabaseClient,
  context: FeedMixerContext,
  catalog: FeedCandidate[]
): Promise<CandidatePools> {
  const filtered = filterCandidates(catalog, {
    excludeKeys: context.excludeKeys,
    recentlySeenKeys: context.recentlySeenKeys,
    skipRecent: context.surface === "reels",
    genreSlug: context.genreSlug ?? context.categorySlug ?? null
  });

  const [profile, followedCreators, coldStartItems, qualifiedGrowth, fdsConfig, taxonomyShare] =
    await Promise.all([
    loadUserInterestProfile(supabase, context.userId),
    loadFollowedCreatorIds(supabase, context.userId),
    getColdStartCandidates(supabase, context.surface, 35),
    getQualifiedGrowthCandidates(supabase, context.surface, 25),
    getFairDistributionConfig(),
    loadTaxonomyExposureShare(supabase, context.surface, 7)
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
    cold_start: tagPool(coldStartItems, "cold_start")
  };
}

export async function getCandidatesForSurface(
  supabase: SupabaseClient,
  surface: FeedSurface,
  userId: string | null,
  context: Omit<FeedMixerContext, "surface" | "userId"> & {
    limit: number;
    requestId?: string;
  }
) {
  const requestId = context.requestId ?? randomUUID();
  const algorithmVersion = await getAlgorithmVersion();
  const weights = normalizePoolWeights(await getPoolWeightsForSurface(surface));

  const mixerContext: FeedMixerContext = {
    surface,
    userId,
    ...context
  };

  const catalog =
    surface === "reels"
      ? await fetchReelCatalogCandidates(supabase, 280)
      : await fetchStoryCatalogCandidates(supabase, 220);

  const pools = await buildCandidatePools(supabase, mixerContext, catalog);
  const mixed = mixCandidatePools(pools, weights, context.limit);
  const fdsConfig = await getFairDistributionConfig();
  const maxStoryRepeats =
    surface === "reels"
      ? fdsConfig.caps.maxRepeatsPerStoryInReels
      : 3;

  const guarded = await applyFairnessGuardPipeline(supabase, {
    surface,
    items: mixed,
    pools,
    limit: context.limit,
    requestId,
    rerankRules: {
      excludeKeys: context.excludeKeys,
      deprioritizeSeenKeys: context.recentlySeenKeys,
      maxConsecutiveSameAuthor: 1,
      maxSameStoryInWindow: maxStoryRepeats,
      storyWindowSize: 30
    }
  });

  const deliverable = guarded.slice(0, Math.max(context.limit, 1));

  void logAlgorithmFeedRequest(supabase, {
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
    poolCounts: countCandidatesByPool(pools),
    candidates: deliverable
  };
}
