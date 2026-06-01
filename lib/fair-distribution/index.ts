export {
  getAlgorithmSettings,
  getFairDistributionConfig,
  updateAlgorithmSettings
} from "@/lib/fair-distribution/settings";
export { loadStoryTaxonomyBatch, loadTaxonomyExposureShare } from "@/lib/fair-distribution/load-taxonomy-context";
export { scoreStoryCandidate, applyScoreBreakdown } from "@/lib/fair-distribution/score-story-candidate";
export {
  applyQualityPenalties,
  loadQualityContextForCandidates,
  computeQualityPenalty
} from "@/lib/fair-distribution/quality-penalties";
export {
  applyAuthorCaps,
  applyTaxonomyFairness,
  rankCandidates,
  runFairDistributionPipeline,
  simulateRanking
} from "@/lib/fair-distribution/rank-candidates";
export { logRecommendationExposure, logRecommendationExposureBatch } from "@/lib/fair-distribution/log-exposure";
export { explainRecommendation } from "@/lib/fair-distribution/explain-recommendation";
export { rollupFairDistributionDaily } from "@/lib/fair-distribution/rollup-daily";
export { generateFdsRecommendationSnapshots } from "@/lib/fair-distribution/generate-score-snapshots";

export async function buildCandidatePool(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  surface: import("@/types/feed-mixer").FeedSurface,
  userId: string | null,
  context: {
    limit: number;
    requestId?: string;
    excludeKeys?: Set<string>;
    recentlySeenKeys?: Set<string>;
    genreSlug?: string | null;
  }
) {
  const { getCandidatesForSurface } = await import("@/lib/feed/pools");
  return getCandidatesForSurface(supabase, surface, userId, context);
}

export async function runSimulation(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  surface: import("@/types/feed-mixer").FeedSurface,
  userId: string | null,
  limit = 30
) {
  const { simulateRanking } = await import("@/lib/fair-distribution/rank-candidates");
  return simulateRanking(supabase, { surface, userId, limit, simulation: true });
}
