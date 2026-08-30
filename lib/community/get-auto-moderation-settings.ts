import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type {
  CommunityAutoModerationSettings,
  CommunityRateLimits,
  ModerationKeywordRule
} from "@/types/community-auto-moderation";

const DEFAULT_RATE_LIMITS: CommunityRateLimits = {
  new_user_posts_per_day: 3,
  normal_posts_per_day: 10,
  trusted_posts_per_day: 30,
  comments_per_minute: 30,
  polls_per_day: 5,
  challenges_per_day: 3,
  post_cooldown_seconds: 60,
  external_link_posts_per_day: 2
};

export const DEFAULT_AUTO_MODERATION_SETTINGS: CommunityAutoModerationSettings = {
  id: "",
  enabled: true,
  mode: "balanced",
  autoApproveMinTrustScore: 70,
  trustedAuthorMinScore: 60,
  prioritizeVerifiedAuthors: true,
  requireEmailVerified: true,
  requireNoActiveStrikes: true,
  maxRejectedPosts30d: 1,
  maxValidReports30d: 0,
  allowExternalLinksForTrusted: false,
  reviewExternalLinks: true,
  autoRejectBlockedKeywords: true,
  reviewNewAccounts: true,
  newAccountDays: 7,
  minPostLength: 10,
  maxPostLength: 5000,
  minApprovedPostsForAuto: 0,
  rateLimits: DEFAULT_RATE_LIMITS,
  allowedDomains: ["chapmee.com", "www.chapmee.com"]
};

function parseRateLimits(value: unknown): CommunityRateLimits {
  if (!value || typeof value !== "object") return DEFAULT_RATE_LIMITS;
  const v = value as Record<string, unknown>;
  return {
    new_user_posts_per_day:
      Number(v.new_user_posts_per_day) || DEFAULT_RATE_LIMITS.new_user_posts_per_day,
    normal_posts_per_day:
      Number(v.normal_posts_per_day) || DEFAULT_RATE_LIMITS.normal_posts_per_day,
    trusted_posts_per_day:
      Number(v.trusted_posts_per_day) || DEFAULT_RATE_LIMITS.trusted_posts_per_day,
    comments_per_minute:
      Number(v.comments_per_minute) || DEFAULT_RATE_LIMITS.comments_per_minute,
    polls_per_day: Number(v.polls_per_day) || DEFAULT_RATE_LIMITS.polls_per_day,
    challenges_per_day:
      Number(v.challenges_per_day) || DEFAULT_RATE_LIMITS.challenges_per_day,
    post_cooldown_seconds:
      Number(v.post_cooldown_seconds) || DEFAULT_RATE_LIMITS.post_cooldown_seconds,
    external_link_posts_per_day:
      Number(v.external_link_posts_per_day) ||
      DEFAULT_RATE_LIMITS.external_link_posts_per_day
  };
}

function mapSettingsRow(row: Record<string, unknown>): CommunityAutoModerationSettings {
  return {
    id: String(row.id),
    enabled: Boolean(row.enabled),
    mode: (row.mode as CommunityAutoModerationSettings["mode"]) ?? "balanced",
    autoApproveMinTrustScore: Number(row.auto_approve_min_trust_score ?? 70),
    trustedAuthorMinScore: Number(row.trusted_author_min_score ?? 60),
    prioritizeVerifiedAuthors: Boolean(row.prioritize_verified_authors ?? true),
    requireEmailVerified: Boolean(row.require_email_verified ?? true),
    requireNoActiveStrikes: Boolean(row.require_no_active_strikes ?? true),
    maxRejectedPosts30d: Number(row.max_rejected_posts_30d ?? 1),
    maxValidReports30d: Number(row.max_valid_reports_30d ?? 0),
    allowExternalLinksForTrusted: Boolean(row.allow_external_links_for_trusted ?? false),
    reviewExternalLinks: Boolean(row.review_external_links ?? true),
    autoRejectBlockedKeywords: Boolean(row.auto_reject_blocked_keywords ?? true),
    reviewNewAccounts: Boolean(row.review_new_accounts ?? true),
    newAccountDays: Number(row.new_account_days ?? 7),
    minPostLength: Number(row.min_post_length ?? 10),
    maxPostLength: Number(row.max_post_length ?? 5000),
    minApprovedPostsForAuto: Number(row.min_approved_posts_for_auto ?? 0),
    rateLimits: parseRateLimits(row.rate_limits),
    allowedDomains: Array.isArray(row.allowed_domains)
      ? (row.allowed_domains as string[])
      : DEFAULT_AUTO_MODERATION_SETTINGS.allowedDomains
  };
}

export async function getAutoModerationSettings(): Promise<CommunityAutoModerationSettings> {
  const db = await createClient();
  const { data, error } = await db
    .from("community_auto_moderation_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error && !isMissingSchemaError(error)) {
    return DEFAULT_AUTO_MODERATION_SETTINGS;
  }

  if (!data) return DEFAULT_AUTO_MODERATION_SETTINGS;
  return mapSettingsRow(data as Record<string, unknown>);
}

export async function getActiveKeywordRules(): Promise<ModerationKeywordRule[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("moderation_keyword_rules")
    .select("*")
    .eq("is_active", true)
    .order("severity", { ascending: false });

  if (error && isMissingSchemaError(error)) {
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    keyword: row.keyword as string,
    matchType: row.match_type as ModerationKeywordRule["matchType"],
    action: row.action as ModerationKeywordRule["action"],
    category: (row.category as string) ?? null,
    severity: row.severity as ModerationKeywordRule["severity"],
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as string
  }));
}

export function effectiveTrustThresholds(settings: CommunityAutoModerationSettings) {
  if (settings.mode === "safe") {
    return {
      autoApproveMin: settings.autoApproveMinTrustScore + 10,
      trustedAuthorMin: settings.trustedAuthorMinScore + 10
    };
  }
  if (settings.mode === "relaxed") {
    return {
      autoApproveMin: Math.max(50, settings.autoApproveMinTrustScore - 10),
      trustedAuthorMin: Math.max(45, settings.trustedAuthorMinScore - 10)
    };
  }
  return {
    autoApproveMin: settings.autoApproveMinTrustScore,
    trustedAuthorMin: settings.trustedAuthorMinScore
  };
}
