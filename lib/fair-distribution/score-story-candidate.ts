import { clamp01 } from "@/lib/scoring/math";
import type {
  FairDistributionConfig,
  ScoreComponentBreakdown,
  ScoredFeedCandidate
} from "@/types/fair-distribution";
import type { FeedCandidate } from "@/types/feed-mixer";

const MS_HOUR = 60 * 60 * 1000;

function hoursSince(iso: string | null) {
  if (!iso) return 9999;
  return (Date.now() - new Date(iso).getTime()) / MS_HOUR;
}

export function computeColdStartScore(
  candidate: FeedCandidate,
  config: FairDistributionConfig,
  storyImpressions = 0
): { score: number; reason?: string } {
  const cold = config.coldStart;
  const hours = hoursSince(candidate.publishedAt);

  if (storyImpressions >= cold.maxBoostUntilImpressions) {
    return { score: 0.35 };
  }

  if (hours <= cold.newStoryBoostHours) {
    const freshness = clamp01(1 - hours / Math.max(cold.newStoryBoostHours, 1));
    return {
      score: clamp01(0.55 + freshness * 0.45),
      reason: "Truyện mới cần test"
    };
  }

  if (candidate.pool === "new_author" || candidate.pool === "cold_start") {
    return {
      score: 0.72,
      reason: "Tác giả/truyện cold start"
    };
  }

  if (storyImpressions < cold.newStoryInitialImpressions * 0.35) {
    return {
      score: 0.65,
      reason: "Chưa đủ impression thử nghiệm"
    };
  }

  return { score: 0.4 };
}

export function computeTaxonomyFairnessScore(
  candidate: FeedCandidate,
  taxonomySharePercent: Map<string, number>,
  config: FairDistributionConfig
): { score: number; reason?: string } {
  const termId = candidate.mainGenreTermId ?? candidate.genreSlug ?? "_none";
  const share = taxonomySharePercent.get(termId) ?? 0;
  const medianShare = taxonomySharePercent.size
    ? [...taxonomySharePercent.values()].reduce((a, b) => a + b, 0) /
      taxonomySharePercent.size
    : 15;

  if (share < medianShare * 0.5) {
    return {
      score: clamp01(0.6 + config.caps.boostUnderexposedTaxonomy),
      reason: "Thể loại đang thiếu exposure"
    };
  }

  if (share > config.caps.maxMainGenreSharePercentInFeed) {
    const over =
      (share - config.caps.maxMainGenreSharePercentInFeed) /
      Math.max(config.caps.maxMainGenreSharePercentInFeed, 1);
    return {
      score: clamp01(0.5 - over * 0.3),
      reason: "Thể loại đang chiếm quá nhiều hiển thị"
    };
  }

  return { score: 0.55 };
}

export function computeDiversityScore(
  candidate: FeedCandidate,
  placed: FeedCandidate[]
): number {
  if (placed.length === 0) return 0.7;

  const authorCount = placed.filter((p) => p.authorUserId === candidate.authorUserId).length;
  const genreKey = candidate.mainGenreTermId ?? candidate.genreSlug ?? "_none";
  const genreCount = placed.filter(
    (p) => (p.mainGenreTermId ?? p.genreSlug ?? "_none") === genreKey
  ).length;
  const storySeen = placed.some((p) => p.storyId === candidate.storyId);

  let score = 0.75;
  if (authorCount >= 2) score -= 0.25;
  if (genreCount >= 3) score -= 0.2;
  if (storySeen) score -= 0.35;

  return clamp01(score);
}

export function scoreStoryCandidate(
  candidate: FeedCandidate,
  options: {
    config: FairDistributionConfig;
    taxonomySharePercent: Map<string, number>;
    storyImpressions?: number;
    placedSoFar?: FeedCandidate[];
    penaltyScore?: number;
    penaltyReasons?: string[];
  }
): ScoreComponentBreakdown {
  const w = options.config.weights;
  const engagementScore = clamp01(candidate.discoveryScore * 0.6 + candidate.qualityScore * 0.4);
  const cold = computeColdStartScore(
    candidate,
    options.config,
    options.storyImpressions ?? 0
  );
  const taxonomy = computeTaxonomyFairnessScore(
    candidate,
    options.taxonomySharePercent,
    options.config
  );
  const diversityScore = computeDiversityScore(candidate, options.placedSoFar ?? []);
  const penaltyScore = options.penaltyScore ?? 0;

  const weighted =
    candidate.qualityScore * w.quality +
    candidate.freshnessScore * w.freshness +
    engagementScore * w.engagement +
    cold.score * w.coldStart +
    diversityScore * w.diversity +
    taxonomy.score * w.taxonomyFairness -
    penaltyScore * w.penalty;

  const reasons: string[] = [];
  if (cold.reason) reasons.push(cold.reason);
  if (taxonomy.reason) reasons.push(taxonomy.reason);
  if (candidate.qualityScore >= 0.55) reasons.push("Tỷ lệ đọc tiếp tốt");
  for (const r of options.penaltyReasons ?? []) reasons.push(r);

  return {
    qualityScore: candidate.qualityScore,
    freshnessScore: candidate.freshnessScore,
    engagementScore,
    coldStartScore: cold.score,
    diversityScore,
    taxonomyFairnessScore: taxonomy.score,
    penaltyScore,
    finalScore: clamp01(weighted),
    capsApplied: [],
    reasons
  };
}

export function applyScoreBreakdown(
  candidate: FeedCandidate,
  breakdown: ScoreComponentBreakdown
): ScoredFeedCandidate {
  return {
    ...candidate,
    mixerScore: breakdown.finalScore,
    scoreBreakdown: breakdown
  };
}
