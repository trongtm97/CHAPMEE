import "server-only";

import { sql } from "drizzle-orm";
import type { DatabaseClient } from "@/lib/db/types";
import { db } from "@/lib/db";
import { PERMANENTLY_HIDDEN_QUALITY_STATUS } from "@/lib/content-quality/public-visibility";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { hydrateRankingSnapshots } from "@/lib/ranking/hydrate-items";
import { RANKING_PAGE_SIZE } from "@/lib/ranking/get-board";
import type {
  RankingBoardResult,
  RankingScoreBreakdown,
  RankingSnapshotRow,
  RankingTimeWindow
} from "@/types/ranking-board";

type AggregateRow = {
  story_id: string;
  author_user_id: string | null;
  total_tickets: string | number;
  supporter_count: number;
};

function timeWindowSinceIso(window: RankingTimeWindow): string | null {
  if (window === "all_time") return null;
  const now = new Date();
  if (window === "day") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  const days = window === "week" ? 7 : 30;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function loadRecommendationAggregates(
  sinceIso: string | null
): Promise<AggregateRow[]> {
  const timeFilter =
    sinceIso === null
      ? sql``
      : sql`and r.created_at >= ${sinceIso}::timestamptz`;

  try {
    const result = await db.execute(sql`
      select
        r.story_id,
        max(cp.user_id)::uuid as author_user_id,
        coalesce(sum(r.tickets_spent), 0)::int as total_tickets,
        count(distinct r.user_id)::int as supporter_count
      from public.story_recommendations r
      inner join public.stories s on s.id = r.story_id
      inner join public.creator_profiles cp on cp.id = s.creator_id
      inner join public.profiles p on p.id = cp.user_id
      where r.status = 'active'
        and s.status in ('approved', 'published')
        and s.visibility = 'public'
        and coalesce(s.moderation_status, '') not in ('flagged', 'removed', 'hidden')
        and coalesce(s.quality_status, '') <> ${PERMANENTLY_HIDDEN_QUALITY_STATUS}
        and coalesce(p.status, 'active') not in ('banned', 'suspended')
        ${timeFilter}
      group by r.story_id
      having coalesce(sum(r.tickets_spent), 0) > 0
      order by total_tickets desc, supporter_count desc
    `);

    return result.rows as AggregateRow[];
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    throw error;
  }
}

function toSnapshotRows(
  aggregates: AggregateRow[],
  timeWindow: RankingTimeWindow,
  offset: number
): RankingSnapshotRow[] {
  const snapshotAt = new Date().toISOString();
  return aggregates.map((row, index) => {
    const totalTickets = Number(row.total_tickets);
    const supporters = Number(row.supporter_count);
    const breakdown: RankingScoreBreakdown = {
      completion_rate: 0,
      next_chapter_rate: 0,
      save_rate: 0,
      follow_rate: 0,
      unlock_rate: 0,
      freshness: 0,
      fairness: 0,
      report_penalty: 0,
      hide_penalty: 0,
      raw_score: totalTickets,
      reason: `${totalTickets.toLocaleString("vi-VN")} Phiếu đề cử · ${supporters} người ủng hộ`
    };

    return {
      id: `rec-live-${row.story_id}`,
      ranking_type: "boosted_stories",
      time_window: timeWindow,
      taxonomy_term_id: null,
      item_type: "story",
      item_id: row.story_id,
      story_id: row.story_id,
      author_user_id: row.author_user_id,
      rank_position: offset + index + 1,
      score: totalTickets,
      score_breakdown: breakdown,
      snapshot_at: snapshotAt
    };
  });
}

/** Live "Được đề cử" board — rank by sum of recommendation tickets spent per story. */
export async function getRecommendedStoriesRankingBoard(
  db: DatabaseClient,
  input: {
    timeWindow: RankingTimeWindow;
    page?: number;
    pageSize?: number;
  }
): Promise<RankingBoardResult> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = input.pageSize ?? RANKING_PAGE_SIZE;
  const sinceIso = timeWindowSinceIso(input.timeWindow);

  try {
    const aggregates = await loadRecommendationAggregates(sinceIso);
    const totalCount = aggregates.length;

    if (totalCount === 0) {
      return {
        boardType: "boosted_stories",
        timeWindow: input.timeWindow,
        genreSlug: null,
        items: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        snapshotAt: null,
        fallbackNote: null,
        metricsNote: null,
        error: null
      };
    }

    const totalPages = Math.ceil(totalCount / pageSize);
    const from = (page - 1) * pageSize;
    const pageSlice = aggregates.slice(from, from + pageSize);
    const rows = toSnapshotRows(pageSlice, input.timeWindow, from);
    const items = await hydrateRankingSnapshots(db, rows, "boosted_stories");

    const enrichedItems = items.map((item) => {
      const row = pageSlice.find((a) => a.story_id === item.id);
      const tickets = row ? Number(row.total_tickets) : item.score;
      return {
        ...item,
        statsLine: `${tickets.toLocaleString("vi-VN")} Phiếu đề cử`,
        reasonBadge: "boosted" as const
      };
    });

    return {
      boardType: "boosted_stories",
      timeWindow: input.timeWindow,
      genreSlug: null,
      items: enrichedItems,
      totalCount,
      page,
      pageSize,
      totalPages,
      snapshotAt: new Date().toISOString(),
      fallbackNote: null,
      metricsNote: null,
      error: null
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        boardType: "boosted_stories",
        timeWindow: input.timeWindow,
        genreSlug: null,
        items: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        snapshotAt: null,
        fallbackNote: null,
        metricsNote: "Chạy migration Phiếu đề cử (0029) để bật bảng xếp hạng.",
        error: null
      };
    }
    throw error;
  }
}
