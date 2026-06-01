import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import { buildScoringConfig } from "@/lib/scoring/config";
import { topAuthorConcentration } from "@/lib/ranking/diversity";
import { getRankingBoard } from "@/lib/ranking/get-board";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type { RankingBoardType, RankingTimeWindow } from "@/types/ranking-board";

export type RankingBoardAdminRow = {
  boardType: RankingBoardType;
  timeWindow: RankingTimeWindow;
  genreId: string | null;
  genreName: string | null;
  lastSnapshotAt: string | null;
  itemCount: number;
  topConcentrationPercent: number;
};

export type RankingAdminDashboardData = {
  error: string | null;
  weights: {
    completion: number;
    nextChapter: number;
    save: number;
    follow: number;
    unlock: number;
    freshness: number;
    fairness: number;
    reportPenalty: number;
    hidePenalty: number;
    maxSameAuthorTopSlots: number;
    retentionDays: number;
  };
  boards: RankingBoardAdminRow[];
  lastRegeneratedAt: string | null;
};

const PRIMARY_BOARDS: Array<{ type: RankingBoardType; window: RankingTimeWindow }> = [
  { type: "top_stories", window: "day" },
  { type: "top_stories", window: "week" },
  { type: "top_stories", window: "month" },
  { type: "new_stories", window: "week" },
  { type: "new_authors", window: "week" },
  { type: "reels_read_through", window: "week" },
  { type: "rising_stories", window: "week" },
  { type: "completed_stories", window: "week" },
  { type: "most_saved", window: "week" },
  { type: "chapter_next_rate", window: "week" },
  { type: "long_tail_quality", window: "week" }
];

export async function loadRankingAdminDashboardData(): Promise<RankingAdminDashboardData> {
  const supabase = createAdminClient();
  const rawConfig = await getAlgorithmConfig();
  const config = buildScoringConfig(rawConfig);

  const num = (key: string, fallback: number) => {
    const v = rawConfig[key];
    const parsed = typeof v === "number" ? v : Number(v);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const weights = {
    completion: config.ranking.weightCompletion,
    nextChapter: config.ranking.weightNextChapter,
    save: config.ranking.weightSave,
    follow: config.ranking.weightFollow,
    unlock: config.ranking.weightUnlock,
    freshness: num("ranking.weight.freshness", 0.05),
    fairness: num("ranking.weight.fairness", 0.05),
    reportPenalty: config.ranking.reportPenaltyWeight,
    hidePenalty: config.ranking.hidePenaltyWeight,
    maxSameAuthorTopSlots: num("ranking.max_same_author_top_slots", 2),
    retentionDays: num("ranking.snapshot_retention_days", 14)
  };

  try {
    const boards: RankingBoardAdminRow[] = [];

    for (const board of PRIMARY_BOARDS) {
      const { data: latest } = await supabase
        .from("ranking_snapshots")
        .select("snapshot_at")
        .eq("ranking_type", board.type)
        .eq("time_window", board.window)
        .is("taxonomy_term_id", null)
        .order("snapshot_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const snapshotAt = (latest?.snapshot_at as string) ?? null;
      let itemCount = 0;
      let topConcentrationPercent = 0;

      if (snapshotAt) {
        const { count } = await supabase
          .from("ranking_snapshots")
          .select("id", { count: "exact", head: true })
          .eq("ranking_type", board.type)
          .eq("time_window", board.window)
          .eq("snapshot_at", snapshotAt)
          .is("taxonomy_term_id", null);

        itemCount = count ?? 0;

        const preview = await getRankingBoard(supabase, {
          boardType: board.type,
          timeWindow: board.window,
          page: 1,
          pageSize: 10
        });
        topConcentrationPercent = topAuthorConcentration(preview.items, 10);
      }

      boards.push({
        boardType: board.type,
        timeWindow: board.window,
        genreId: null,
        genreName: null,
        lastSnapshotAt: snapshotAt,
        itemCount,
        topConcentrationPercent
      });
    }

    const { data: genreBoards } = await supabase
      .from("ranking_snapshots")
      .select("ranking_type, time_window, taxonomy_term_id, snapshot_at, taxonomy_terms(name)")
      .eq("ranking_type", "genre_stories")
      .not("taxonomy_term_id", "is", null)
      .order("snapshot_at", { ascending: false })
      .limit(20);

    const seen = new Set<string>();
    for (const row of (genreBoards ?? []) as Array<{
      taxonomy_term_id: string;
      time_window: string;
      snapshot_at: string;
      taxonomy_terms: { name: string } | { name: string }[] | null;
    }>) {
      const termId = row.taxonomy_term_id;
      const key = `${termId}:${row.time_window}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const termRelation = Array.isArray(row.taxonomy_terms)
        ? row.taxonomy_terms[0]
        : row.taxonomy_terms;
      const genreName = termRelation?.name ?? null;

      const { count } = await supabase
        .from("ranking_snapshots")
        .select("id", { count: "exact", head: true })
        .eq("ranking_type", "genre_stories")
        .eq("time_window", row.time_window)
        .eq("taxonomy_term_id", termId)
        .eq("snapshot_at", row.snapshot_at);

      boards.push({
        boardType: "genre_stories",
        timeWindow: row.time_window as RankingTimeWindow,
        genreId: termId,
        genreName,
        lastSnapshotAt: row.snapshot_at as string,
        itemCount: count ?? 0,
        topConcentrationPercent: 0
      });
    }

    const { data: lastRow } = await supabase
      .from("ranking_snapshots")
      .select("snapshot_at")
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      error: null,
      weights,
      boards,
      lastRegeneratedAt: (lastRow?.snapshot_at as string) ?? null
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        error: "Migration ranking_snapshots chưa được apply.",
        weights,
        boards: [],
        lastRegeneratedAt: null
      };
    }

    return {
      error: error instanceof Error ? error.message : "Không tải được dữ liệu ranking.",
      weights,
      boards: [],
      lastRegeneratedAt: null
    };
  }
}
