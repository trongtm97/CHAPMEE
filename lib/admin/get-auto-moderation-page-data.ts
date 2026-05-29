import { getAutoModerationSettings, getActiveKeywordRules } from "@/lib/community/get-auto-moderation-settings";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type {
  AutoModerationDashboardStats,
  AutoModerationPageData,
  ModerationDecisionLogItem,
  MatchedRule
} from "@/types/community-auto-moderation";

function firstRelation<T>(relation: unknown): T | null {
  if (relation == null) return null;
  return Array.isArray(relation) ? ((relation[0] as T) ?? null) : (relation as T);
}

export async function getAutoModerationPageData(): Promise<AutoModerationPageData> {
  const emptyStats: AutoModerationDashboardStats = {
    autoApproved24h: 0,
    needsReview24h: 0,
    autoRejected24h: 0,
    rateLimited24h: 0,
    topReasons: [],
    topKeywords: []
  };

  try {
    const supabase = await createClient();
    const since24h = new Date(Date.now() - 86_400_000).toISOString();

    const [settings, keywordRules, decisionsRes] = await Promise.all([
      getAutoModerationSettings(),
      getActiveKeywordRules(),
      supabase
        .from("community_moderation_decisions")
        .select(
          "id, post_id, user_id, decision, trust_score, reason_codes, matched_rules, final_status, overridden_by, overridden_at, created_at, profiles:user_id(display_name, username)"
        )
        .gte("created_at", since24h)
        .order("created_at", { ascending: false })
        .limit(200)
    ]);

    const recentAllRes = await supabase
      .from("community_moderation_decisions")
      .select(
        "id, post_id, user_id, decision, trust_score, reason_codes, matched_rules, final_status, overridden_by, overridden_at, created_at, profiles:user_id(display_name, username)"
      )
      .order("created_at", { ascending: false })
      .limit(15);

    const decisions24h = decisionsRes.data ?? [];
    const stats: AutoModerationDashboardStats = {
      autoApproved24h: decisions24h.filter((d) => d.decision === "auto_approved").length,
      needsReview24h: decisions24h.filter((d) => d.decision === "needs_review").length,
      autoRejected24h: decisions24h.filter(
        (d) => d.decision === "auto_rejected" || d.decision === "auto_hidden"
      ).length,
      rateLimited24h: decisions24h.filter((d) => d.decision === "rate_limited").length,
      topReasons: [],
      topKeywords: []
    };

    const reasonCounts = new Map<string, number>();
    for (const row of decisions24h) {
      for (const code of (row.reason_codes as string[]) ?? []) {
        reasonCounts.set(code, (reasonCounts.get(code) ?? 0) + 1);
      }
    }
    stats.topReasons = [...reasonCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([code, count]) => ({ code, count }));

    const kwCounts = new Map<string, number>();
    for (const row of decisions24h) {
      const rules = (row.matched_rules as MatchedRule[]) ?? [];
      for (const r of rules) {
        if (r.rule.includes("keyword") || r.rule === "blocked_keyword") {
          kwCounts.set(r.rule, (kwCounts.get(r.rule) ?? 0) + 1);
        }
      }
    }
    stats.topKeywords = [...kwCounts.entries()]
      .slice(0, 5)
      .map(([keyword, count]) => ({ keyword, count }));

    const mapDecision = (row: Record<string, unknown>): ModerationDecisionLogItem => {
      const profile = firstRelation<{
        display_name: string | null;
        username: string | null;
      }>(row.profiles);

      return {
        id: row.id as string,
        postId: (row.post_id as string) ?? null,
        userId: row.user_id as string,
        userLabel: profile?.display_name ?? profile?.username ?? null,
        decision: row.decision as ModerationDecisionLogItem["decision"],
        trustScore: row.trust_score != null ? Number(row.trust_score) : null,
        reasonCodes: (row.reason_codes as string[]) ?? [],
        matchedRules: (row.matched_rules as MatchedRule[]) ?? [],
        finalStatus: row.final_status as string,
        overriddenBy: (row.overridden_by as string) ?? null,
        overriddenAt: (row.overridden_at as string) ?? null,
        createdAt: row.created_at as string
      };
    };

    const recentDecisions = (recentAllRes.data ?? []).map((row) =>
      mapDecision(row as Record<string, unknown>)
    );

    if (decisionsRes.error && isMissingSchemaError(decisionsRes.error)) {
      return {
        settings,
        keywordRules,
        recentDecisions: [],
        stats: emptyStats,
        error: "Chạy migration 097 để bật log quyết định."
      };
    }

    return {
      settings,
      keywordRules,
      recentDecisions,
      stats,
      error: null
    };
  } catch (error) {
    return {
      settings: await getAutoModerationSettings(),
      keywordRules: [],
      recentDecisions: [],
      stats: emptyStats,
      error:
        error instanceof Error
          ? error.message
          : "Không tải được cấu hình duyệt tự động."
    };
  }
}
