import { getFairDistributionConfig } from "@/lib/fair-distribution/settings";
import {
  applyScoreBreakdown,
  scoreStoryCandidate
} from "@/lib/fair-distribution/score-story-candidate";
import {
  applyQualityPenalties,
  computeQualityPenalty,
  loadQualityContextForCandidates
} from "@/lib/fair-distribution/quality-penalties";
import { loadTaxonomyExposureShare } from "@/lib/fair-distribution/load-taxonomy-context";
import { enforceFeedDiversity } from "@/lib/fairness/diversity";
import { applyExposureCaps } from "@/lib/fairness/apply-exposure-caps";
import { loadExposure7dContext } from "@/lib/fairness/load-exposure-7d";
import { createAdminClient } from "@/lib/data/admin";
import type {
  FairDistributionContext,
  ScoredFeedCandidate,
  SimulationResult
} from "@/types/fair-distribution";
import type { FeedCandidate, FeedSurface } from "@/types/feed-mixer";
import type { DatabaseClient } from "@/lib/db/types";
import { summarizeFeedDiversity } from "@/lib/fairness/diversity";

function genreShareInFeed(items: FeedCandidate[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.mainGenreTermId ?? item.genreSlug ?? "_none";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = items.length || 1;
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, sharePercent: (count / total) * 100 }))
    .sort((a, b) => b.sharePercent - a.sharePercent);
}

export function applyTaxonomyFairness(
  items: FeedCandidate[],
  taxonomySharePercent: Map<string, number>,
  config: Awaited<ReturnType<typeof getFairDistributionConfig>>
): FeedCandidate[] {
  return items
    .map((item) => {
      const termId = item.mainGenreTermId ?? item.genreSlug ?? "_none";
      const share = taxonomySharePercent.get(termId) ?? 0;
      let score = item.mixerScore;

      if (share < config.caps.minColdTaxonomySharePercent) {
        score += config.caps.boostUnderexposedTaxonomy;
      } else if (share > config.caps.maxMainGenreSharePercentInFeed) {
        const over =
          (share - config.caps.maxMainGenreSharePercentInFeed) /
          Math.max(config.caps.maxMainGenreSharePercentInFeed, 1);
        score -= Math.min(0.4, over * config.caps.reduceScoreIfAuthorOverexposed);
      }

      return { ...item, mixerScore: Math.max(0, Math.min(2, score)) };
    })
    .sort((a, b) => b.mixerScore - a.mixerScore);
}

export function applyAuthorCaps(
  items: FeedCandidate[],
  maxItemsPerAuthor: number
): FeedCandidate[] {
  const authorCounts = new Map<string, number>();
  const result: FeedCandidate[] = [];
  const deferred: FeedCandidate[] = [];

  for (const item of items) {
    const count = authorCounts.get(item.authorUserId) ?? 0;
    if (count >= maxItemsPerAuthor) {
      deferred.push(item);
      continue;
    }
    authorCounts.set(item.authorUserId, count + 1);
    result.push(item);
  }

  return [...result, ...deferred];
}

export async function rankCandidates(
  db: DatabaseClient,
  candidates: FeedCandidate[],
  context: FairDistributionContext
): Promise<ScoredFeedCandidate[]> {
  const config = await getFairDistributionConfig();
  const { flags, qualityStatuses } = await loadQualityContextForCandidates(db,
    candidates
  );
  const filtered = applyQualityPenalties(candidates, config, flags, qualityStatuses);
  const taxonomyShare = await loadTaxonomyExposureShare(db, context.surface, 7);

  const placed: FeedCandidate[] = [];
  const scored: ScoredFeedCandidate[] = [];

  for (const candidate of filtered.sort((a, b) => b.mixerScore - a.mixerScore)) {
    const penalty = computeQualityPenalty(
      candidate.storyId,
      config,
      flags,
      qualityStatuses.get(candidate.storyId)
    );
    const breakdown = scoreStoryCandidate(candidate, {
      config,
      taxonomySharePercent: taxonomyShare,
      placedSoFar: placed,
      penaltyScore: penalty.penalty,
      penaltyReasons: penalty.reasons
    });
    const scoredCandidate = applyScoreBreakdown(candidate, breakdown);
    placed.push(scoredCandidate);
    scored.push(scoredCandidate);
  }

  scored.sort((a, b) => b.mixerScore - a.mixerScore);
  return scored.slice(0, context.limit ?? scored.length);
}

export async function runFairDistributionPipeline(
  db: DatabaseClient,
  input: {
    surface: FeedSurface;
    items: FeedCandidate[];
    limit: number;
    requestId?: string;
  }
): Promise<FeedCandidate[]> {
  const config = await getFairDistributionConfig();
  const { flags, qualityStatuses } = await loadQualityContextForCandidates(db,
    input.items
  );

  let items = applyQualityPenalties(input.items, config, flags, qualityStatuses);

  let exposure;
  try {
    exposure = await loadExposure7dContext(createAdminClient(), input.surface);
  } catch {
    exposure = await loadExposure7dContext(db, input.surface);
  }

  items = await applyExposureCaps(items, input.surface, exposure, { db,
    requestId: input.requestId
  });

  const taxonomyShare = await loadTaxonomyExposureShare(db, input.surface, 7);
  items = applyTaxonomyFairness(items, taxonomyShare, config);
  items = applyAuthorCaps(items, config.caps.maxItemsPerAuthorPerPage);

  return enforceFeedDiversity(items, {
    maxAuthorSharePerFeedPercent: config.caps.maxAuthorSharePerFeedPercent,
    maxMainGenreSharePercent: config.caps.maxMainGenreSharePercentInFeed,
    targetLength: Math.max(input.limit * 2, input.limit + 20)
  }).slice(0, input.limit);
}

export async function simulateRanking(
  db: DatabaseClient,
  context: FairDistributionContext & { limit?: number }
): Promise<SimulationResult> {
  const surface = context.surface as SimulationResult["surface"];
  const limit = context.limit ?? 30;

  const { getCandidatesForSurface } = await import("@/lib/feed/pools");
  const mixed = await getCandidatesForSurface(db, context.surface, context.userId, {
    limit: limit * 3,
    requestId: `sim-${Date.now()}`,
    excludeKeys: context.recentlySeenKeys,
    recentlySeenKeys: context.recentlySeenKeys
  });

  const ranked = await rankCandidates(db, mixed.candidates, {
    ...context,
    simulation: true,
    limit
  });

  const diversity = summarizeFeedDiversity(ranked);
  const genreShares = genreShareInFeed(ranked);

  return {
    surface,
    candidates: ranked.map((c) => ({
      storyId: c.storyId,
      itemId: c.itemId,
      itemType: c.itemType,
      authorUserId: c.authorUserId,
      genreName: c.genreName,
      finalScore: c.scoreBreakdown?.finalScore ?? c.mixerScore,
      breakdown: c.scoreBreakdown ?? {
        qualityScore: c.qualityScore,
        freshnessScore: c.freshnessScore,
        engagementScore: c.discoveryScore,
        coldStartScore: 0,
        diversityScore: 0,
        taxonomyFairnessScore: 0,
        penaltyScore: 0,
        finalScore: c.mixerScore,
        capsApplied: [],
        reasons: []
      }
    })),
    diversitySummary: {
      uniqueAuthors: diversity.uniqueAuthors,
      uniqueGenres: new Set(ranked.map((r) => r.genreSlug ?? "_none")).size,
      topAuthorSharePercent: diversity.authorShares[0]?.sharePercent ?? 0,
      topGenreSharePercent: genreShares[0]?.sharePercent ?? 0
    }
  };
}
