import type { RankingTimePeriod } from "@/types/ranking";

export const hotStoryScoreWeights = {
  reads: 1,
  likes: 3,
  comments: 5,
  saves: 6,
  shares: 8,
  follows: 6
} as const;

export const risingStoryBoostWeights = {
  new_story_bonus: 50,
  growth_multiplier: 2
} as const;

export const topAuthorScoreWeights = {
  total_reads: 1,
  new_followers: 5,
  story_count: 10
} as const;

export function getTimePeriodStart(period: RankingTimePeriod): Date | null {
  const now = Date.now();

  switch (period) {
    case "today": {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      const d = new Date(now - 7 * 24 * 60 * 60 * 1000);
      return d;
    }
    case "all":
      return null;
  }
}

export function isRisingStory(
  publishedAt: string | null,
  recentScore: number,
  risingThreshold = 10
): boolean {
  if (!publishedAt) return false;

  const publishedDate = new Date(publishedAt);
  const daysSincePublished =
    (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSincePublished > 30) return false;

  return recentScore >= risingThreshold;
}

export function computeAuthorScore(input: {
  totalReads: number;
  followerCount: number;
  storyCount: number;
}): number {
  return (
    input.totalReads * topAuthorScoreWeights.total_reads +
    input.followerCount * topAuthorScoreWeights.new_followers +
    input.storyCount * topAuthorScoreWeights.story_count
  );
}

export function getTrendingStoryWindowLabel(
  period: RankingTimePeriod
): string {
  switch (period) {
    case "today":
      return "24h";
    case "week":
      return "7d";
    case "all":
      return "all";
  }
}
