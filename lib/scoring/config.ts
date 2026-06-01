import type { AlgorithmConfig } from "@/types/algorithm-settings";

function num(config: AlgorithmConfig, key: string, fallback: number) {
  const value = config[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export type ScoringConfig = {
  ranking: {
    weightCompletion: number;
    weightNextChapter: number;
    weightSave: number;
    weightFollow: number;
    weightUnlock: number;
    reportPenaltyWeight: number;
    hidePenaltyWeight: number;
  };
  reels: {
    weightPersonalized: number;
    weightTrendingQuality: number;
    weightNewUnderExposed: number;
    weightFollowedAuthor: number;
    weightLongTailQuality: number;
  };
  discover: {
    weightPersonalized: number;
    weightFresh: number;
    weightGrowing: number;
    weightCompletedStory: number;
    weightNewAuthor: number;
    weightLongTail: number;
  };
  search: {
    weightTextRelevance: number;
    weightQuality: number;
    weightExactMatch: number;
    weightFreshness: number;
    weightFairness: number;
  };
  coldStart: {
    newStoryInitialImpressions: number;
    newReelInitialImpressions: number;
    newAuthorDailyMinImpressions: number;
    minTestWindowHours: number;
    maxTestWindowHours: number;
  };
  fairness: {
    authorExposureCap7dPercent: number;
    storyExposureCap7dPercent: number;
    authorOverCapPenalty: number;
    storyOverCapPenalty: number;
    longTailQualityBoost: number;
    underExposedBoost: number;
    minLongTailSlotsPercent: number;
  };
  safety: {
    reportRateThreshold: number;
    hideRateThreshold: number;
    reportPenalty: number;
    hidePenalty: number;
    policyWarningPenalty: number;
  };
  spam: {
    duplicateContentPenalty: number;
    tagAbusePenalty: number;
    titleMismatchPenalty: number;
    lowQualityAuthorPenalty: number;
  };
};

export function buildScoringConfig(config: AlgorithmConfig): ScoringConfig {
  return {
    ranking: {
      weightCompletion: num(config, "ranking.weight.completion_rate", 0.3),
      weightNextChapter: num(config, "ranking.weight.next_chapter_rate", 0.25),
      weightSave: num(config, "ranking.weight.save_rate", 0.15),
      weightFollow: num(config, "ranking.weight.follow_rate", 0.1),
      weightUnlock: num(config, "ranking.weight.unlock_rate", 0.1),
      reportPenaltyWeight: num(config, "ranking.report_penalty_weight", 0.3),
      hidePenaltyWeight: num(config, "ranking.hide_penalty_weight", 0.2)
    },
    reels: {
      weightPersonalized: num(config, "reels.weight.personalized", 0.4),
      weightTrendingQuality: num(config, "reels.weight.trending_quality", 0.2),
      weightNewUnderExposed: num(config, "reels.weight.new_under_exposed", 0.2),
      weightFollowedAuthor: num(config, "reels.weight.followed_author", 0.1),
      weightLongTailQuality: num(config, "reels.weight.long_tail_quality", 0.1)
    },
    discover: {
      weightPersonalized: num(config, "discover.weight.personalized", 0.25),
      weightFresh: num(config, "discover.weight.fresh", 0.2),
      weightGrowing: num(config, "discover.weight.growing", 0.2),
      weightCompletedStory: num(config, "discover.weight.completed_story", 0.15),
      weightNewAuthor: num(config, "discover.weight.new_author", 0.1),
      weightLongTail: num(config, "discover.weight.long_tail", 0.1)
    },
    search: {
      weightTextRelevance: num(config, "search.weight.text_relevance", 0.45),
      weightQuality: num(config, "search.weight.quality", 0.2),
      weightExactMatch: num(config, "search.weight.exact_match", 0.15),
      weightFreshness: num(config, "search.weight.freshness", 0.1),
      weightFairness: num(config, "search.weight.fairness", 0.1)
    },
    coldStart: {
      newStoryInitialImpressions: num(
        config,
        "cold_start.new_story_initial_impressions",
        500
      ),
      newReelInitialImpressions: num(
        config,
        "cold_start.new_reel_initial_impressions",
        1000
      ),
      newAuthorDailyMinImpressions: num(
        config,
        "cold_start.new_author_daily_min_impressions",
        200
      ),
      minTestWindowHours: num(config, "cold_start.min_test_window_hours", 24),
      maxTestWindowHours: num(config, "cold_start.max_test_window_hours", 72)
    },
    fairness: {
      authorExposureCap7dPercent: num(
        config,
        "fairness.author_exposure_cap_7d_percent",
        10
      ),
      storyExposureCap7dPercent: num(
        config,
        "fairness.story_exposure_cap_7d_percent",
        8
      ),
      authorOverCapPenalty: num(config, "fairness.author_over_cap_penalty", 0.2),
      storyOverCapPenalty: num(config, "fairness.story_over_cap_penalty", 0.2),
      longTailQualityBoost: num(config, "fairness.long_tail_quality_boost", 0.25),
      underExposedBoost: num(config, "fairness.under_exposed_boost", 0.2),
      minLongTailSlotsPercent: num(
        config,
        "fairness.min_long_tail_slots_percent",
        10
      )
    },
    safety: {
      reportRateThreshold: num(config, "safety.report_rate_threshold", 0.03),
      hideRateThreshold: num(config, "safety.hide_rate_threshold", 0.05),
      reportPenalty: num(config, "safety.report_penalty", 0.5),
      hidePenalty: num(config, "safety.hide_penalty", 0.3),
      policyWarningPenalty: num(config, "safety.policy_warning_penalty", 0.4)
    },
    spam: {
      duplicateContentPenalty: num(config, "spam.duplicate_content_penalty", 0.5),
      tagAbusePenalty: num(config, "spam.tag_abuse_penalty", 0.3),
      titleMismatchPenalty: num(config, "spam.title_mismatch_penalty", 0.3),
      lowQualityAuthorPenalty: num(config, "spam.low_quality_author_penalty", 0.2)
    }
  };
}
