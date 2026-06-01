import { createClient } from "@/lib/supabase/server";
import { getTimePeriodStart } from "@/lib/rankings/ranking-formulas";
import type {
  EarningAuthorRankingItem,
  SupporterRankingItem,
  RankingTimePeriod
} from "@/types/ranking";

type EarningAuthorRow = {
  author_id: string;
  user_id: string;
  pen_name: string;
  avatar_url: string | null;
  gross_revenue: number;
  supporter_count: number;
  paid_reader_count: number;
};

type SupporterRow = {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  total_supported: number;
  support_count: number;
  is_anonymous: boolean;
};

export async function getTopEarningAuthors(
  period: RankingTimePeriod,
  limit = 20
): Promise<EarningAuthorRankingItem[]> {
  try {
    const supabase = await createClient();
    const windowStart = getTimePeriodStart(period)?.toISOString() ?? null;

    const { data } = await supabase.rpc("get_top_earning_authors", {
      window_start: windowStart,
      ranking_limit: limit
    });

    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    const rows = data as unknown as EarningAuthorRow[];
    const userIds = rows.map((row) => row.user_id).filter(Boolean);
    const usernameByUserId = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

      for (const profile of profiles ?? []) {
        const username = (profile.username as string | null)?.trim().toLowerCase();
        if (username) {
          usernameByUserId.set(profile.id as string, username);
        }
      }
    }

    return rows.map((row, index) => ({
      id: row.author_id,
      rank: index + 1,
      userId: row.user_id,
      username: usernameByUserId.get(row.user_id) ?? null,
      displayName: row.pen_name,
      avatarUrl: row.avatar_url,
      grossRevenue: Number(row.gross_revenue),
      supporterCount: Number(row.supporter_count),
      paidReaderCount: Number(row.paid_reader_count)
    }));
  } catch {
    return [];
  }
}

export async function getTopSupporters(
  period: RankingTimePeriod,
  limit = 20
): Promise<SupporterRankingItem[]> {
  try {
    const supabase = await createClient();
    const windowStart = getTimePeriodStart(period)?.toISOString() ?? null;

    const { data } = await supabase.rpc("get_top_supporters", {
      window_start: windowStart,
      ranking_limit: limit
    });

    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    const rows = data as unknown as SupporterRow[];

    return rows.map((row, index) => ({
      id: row.user_id,
      rank: index + 1,
      displayName: row.display_name,
      username: row.username,
      avatarUrl: row.avatar_url,
      isAnonymous: Boolean(row.is_anonymous),
      totalSupported: Number(row.total_supported),
      supportCount: Number(row.support_count)
    }));
  } catch {
    return [];
  }
}
