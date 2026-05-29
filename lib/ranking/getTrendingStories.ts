import { createPublicClient } from "@/lib/supabase/public-client";
import {
  getStoryRankingStart,
  type RankedStoryScore,
  type StoryRankingWindow
} from "@/lib/ranking/storyRanking";

type RankingRow = {
  story_id: string;
  score: number;
};

export async function getStoryRankingScores(
  window: StoryRankingWindow,
  limit = 50
): Promise<Map<string, number>> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("get_public_story_rankings", {
      ranking_limit: limit,
      window_start: getStoryRankingStart(window)
    });

    if (error) {
      return new Map();
    }

    const rows = (data ?? []) as RankingRow[];
    return new Map(
      rows.map((row) => [String(row.story_id), Number(row.score) || 0])
    );
  } catch {
    return new Map();
  }
}

export async function getRankedStoryIds(
  window: StoryRankingWindow,
  limit = 50
): Promise<RankedStoryScore[]> {
  const scores = await getStoryRankingScores(window, limit);

  return [...scores.entries()]
    .map(([storyId, score]) => ({ storyId, score }))
    .sort((first, second) => second.score - first.score)
    .slice(0, limit);
}
