import {
  checkDuplicateContent,
  checkExternalLinks,
  detectSpamPatterns,
  runKeywordChecks
} from "@/lib/community/auto-moderation-content-checks";
import { userMessageForDecision } from "@/lib/community/auto-moderation-labels";
import type { UserTrustScoreBreakdown } from "@/types/community-auto-moderation";
import { effectiveTrustThresholds } from "@/lib/community/get-auto-moderation-settings";
import type { CommunityAutoModerationSettings } from "@/types/community-auto-moderation";
import { hasActiveRestriction } from "@/lib/moderation/check-restriction";
import { createClient } from "@/lib/data/server";
import type {
  AutoModerationDecision,
  AutoModerationResult,
  MatchedRule,
  ModerationKeywordRule,
  ModerationReasonCode
} from "@/types/community-auto-moderation";

export type RunAutoModerationInput = {
  userId: string;
  title: string;
  content: string;
  postType: string;
  storyId: string | null;
  settings: CommunityAutoModerationSettings;
  keywordRules: ModerationKeywordRule[];
  trust: UserTrustScoreBreakdown;
};

async function checkRateLimit(
  input: RunAutoModerationInput
): Promise<{ limited: boolean; matched: MatchedRule[] }> {
  const db = await createClient();
  const limits = input.settings.rateLimits;
  const matched: MatchedRule[] = [];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let dailyCap = limits.normal_posts_per_day;
  if (input.trust.communityTrusted || input.trust.score >= 80) {
    dailyCap = limits.trusted_posts_per_day;
  } else if (input.trust.accountAgeDays < input.settings.newAccountDays) {
    dailyCap = limits.new_user_posts_per_day;
  }

  const { count: todayCount } = await db
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .gte("created_at", todayStart.toISOString());

  if ((todayCount ?? 0) >= dailyCap) {
    matched.push({
      rule: "rate_limit_daily",
      detail: `${todayCount}/${dailyCap} bài/ngày`
    });
    return { limited: true, matched };
  }

  if (limits.post_cooldown_seconds > 0) {
    const since = new Date(Date.now() - limits.post_cooldown_seconds * 1000).toISOString();
    const { count: recent } = await db
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.userId)
      .gte("created_at", since);

    if ((recent ?? 0) > 0) {
      matched.push({
        rule: "rate_limit_cooldown",
        detail: `${limits.post_cooldown_seconds}s`
      });
      return { limited: true, matched };
    }
  }

  return { limited: false, matched };
}

async function isStoryGroupLocked(storyId: string | null) {
  if (!storyId) return false;
  const db = await createClient();
  const { data } = await db
    .from("community_group_settings")
    .select("posting_locked, status")
    .eq("group_type", "story")
    .eq("group_id", storyId)
    .maybeSingle();

  return Boolean(data?.posting_locked || data?.status === "posting_locked");
}

export async function runAutoModeration(
  input: RunAutoModerationInput
): Promise<AutoModerationResult> {
  const reasonCodes: ModerationReasonCode[] = [];
  const matchedRules: MatchedRule[] = [];
  const thresholds = effectiveTrustThresholds(input.settings);
  const combined = `${input.title}\n${input.content}`;

  if (!input.settings.enabled) {
    return {
      decision: "needs_review",
      postStatus: "pending",
      reasonCodes: ["auto_moderation_disabled"],
      matchedRules: [{ rule: "disabled", detail: "Duyệt tự động tắt" }],
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("needs_review")
    };
  }

  if (
    input.trust.communityRestricted &&
    input.trust.accountAgeDays >= 0
  ) {
    reasonCodes.push("community_restricted");
    matchedRules.push({ rule: "community_restricted" });
    return {
      decision: "auto_rejected",
      postStatus: "rejected",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("auto_rejected")
    };
  }

  const postBlocked = await hasActiveRestriction(input.userId, "post_block");
  if (postBlocked) {
    reasonCodes.push("community_restricted");
    return {
      decision: "auto_rejected",
      postStatus: "rejected",
      reasonCodes,
      matchedRules: [{ rule: "post_block_restriction" }],
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("auto_rejected")
    };
  }

  const rate = await checkRateLimit(input);
  if (rate.limited) {
    return {
      decision: "rate_limited",
      postStatus: "rejected",
      reasonCodes: ["rate_limited"],
      matchedRules: rate.matched,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("rate_limited")
    };
  }

  const len = combined.trim().length;
  if (len < input.settings.minPostLength) {
    reasonCodes.push("too_short");
    matchedRules.push({ rule: "min_length", detail: String(len) });
    return {
      decision: "auto_rejected",
      postStatus: "rejected",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("auto_rejected")
    };
  }

  if (len > input.settings.maxPostLength) {
    reasonCodes.push("too_long");
    matchedRules.push({ rule: "max_length", detail: String(len) });
    return {
      decision: "needs_review",
      postStatus: "pending",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("needs_review")
    };
  }

  const kw = runKeywordChecks(input.title, input.content, input.keywordRules);
  if (kw.hasHighSeverityBlock || (kw.hasBlockedKeyword && input.settings.autoRejectBlockedKeywords)) {
    reasonCodes.push("blocked_keyword");
    matchedRules.push({ rule: "blocked_keyword" });
    return {
      decision: kw.hasHighSeverityBlock ? "auto_hidden" : "auto_rejected",
      postStatus: kw.hasHighSeverityBlock ? "hidden" : "rejected",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("auto_rejected")
    };
  }

  const spam = detectSpamPatterns(input.title, input.content);
  if (spam.includes("almost_no_letters")) {
    reasonCodes.push("spam_pattern");
    matchedRules.push({ rule: "spam_pattern", detail: spam.join(", ") });
    return {
      decision: "auto_rejected",
      postStatus: "rejected",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("auto_rejected")
    };
  }

  const db = await createClient();
  const isDuplicate = await checkDuplicateContent(
    db,
    input.userId,
    input.title,
    input.content
  );
  if (isDuplicate) {
    reasonCodes.push("duplicate_content");
    matchedRules.push({ rule: "duplicate_content" });
    return {
      decision: "auto_rejected",
      postStatus: "rejected",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("auto_rejected")
    };
  }

  if (await isStoryGroupLocked(input.storyId)) {
    reasonCodes.push("group_posting_locked");
    matchedRules.push({ rule: "story_group_locked" });
    return {
      decision: "auto_rejected",
      postStatus: "rejected",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("auto_rejected")
    };
  }

  const allowLinks =
    input.trust.communityTrusted && input.settings.allowExternalLinksForTrusted;
  const linkCheck = checkExternalLinks(
    combined,
    input.settings.allowedDomains,
    allowLinks
  );

  if (linkCheck.hasExternalLink && !linkCheck.externalLinkAllowed) {
    if (input.settings.reviewExternalLinks) {
      reasonCodes.push("external_link_needs_review");
      matchedRules.push({ rule: "external_link" });
      return {
        decision: "needs_review",
        postStatus: "pending",
        reasonCodes,
        matchedRules,
        trustScore: input.trust.score,
        userMessage: userMessageForDecision("needs_review")
      };
    }
    reasonCodes.push("external_link_blocked");
    matchedRules.push({ rule: "external_link_blocked" });
    return {
      decision: "auto_rejected",
      postStatus: "rejected",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("auto_rejected")
    };
  }

  if (input.settings.requireNoActiveStrikes && input.trust.activeStrikeCount > 0) {
    reasonCodes.push("active_strike");
    matchedRules.push({
      rule: "active_strike",
      detail: String(input.trust.activeStrikeCount)
    });
    return {
      decision: "needs_review",
      postStatus: "pending",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("needs_review")
    };
  }

  if (input.trust.rejectedPostCount30d > input.settings.maxRejectedPosts30d) {
    reasonCodes.push("rejected_posts_threshold");
    return {
      decision: "needs_review",
      postStatus: "pending",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("needs_review")
    };
  }

  if (input.trust.validReportCount30d > input.settings.maxValidReports30d) {
    reasonCodes.push("too_many_reports");
    return {
      decision: "needs_review",
      postStatus: "pending",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("needs_review")
    };
  }

  if (kw.hasReviewKeyword) {
    reasonCodes.push("review_keyword");
    matchedRules.push({ rule: "review_keyword" });
    return {
      decision: "needs_review",
      postStatus: "pending",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("needs_review")
    };
  }

  if (spam.length > 0 && !spam.includes("almost_no_letters")) {
    reasonCodes.push("spam_pattern");
    matchedRules.push({ rule: "spam_pattern", detail: spam.join(", ") });
    return {
      decision: "needs_review",
      postStatus: "pending",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("needs_review")
    };
  }

  const verifiedAuthor =
    input.settings.prioritizeVerifiedAuthors && input.trust.isVerifiedAuthor;
  const authorThreshold = thresholds.trustedAuthorMin;

  if (verifiedAuthor && input.trust.score >= authorThreshold) {
    if (input.settings.requireEmailVerified && !input.trust.emailVerified) {
      reasonCodes.push("email_not_verified");
      return {
        decision: "needs_review",
        postStatus: "pending",
        reasonCodes,
        matchedRules,
        trustScore: input.trust.score,
        userMessage: userMessageForDecision("needs_review")
      };
    }
    reasonCodes.push("verified_author_auto_approved");
    matchedRules.push({ rule: "verified_author_fast_path" });
    return {
      decision: "auto_approved",
      postStatus: "approved",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("auto_approved")
    };
  }

  if (
    input.settings.reviewNewAccounts &&
    input.trust.accountAgeDays < input.settings.newAccountDays
  ) {
    reasonCodes.push("new_account_needs_review");
    matchedRules.push({
      rule: "new_account",
      detail: `${input.trust.accountAgeDays} ngày`
    });
    return {
      decision: "needs_review",
      postStatus: "pending",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("needs_review")
    };
  }

  if (input.trust.approvedPostCount < input.settings.minApprovedPostsForAuto) {
    reasonCodes.push("insufficient_approved_posts");
    return {
      decision: "needs_review",
      postStatus: "pending",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("needs_review")
    };
  }

  const canAutoApprove =
    input.trust.score >= thresholds.autoApproveMin &&
    (!input.settings.requireEmailVerified || input.trust.emailVerified) &&
    input.trust.activeStrikeCount === 0 &&
    input.trust.rejectedPostCount30d <= input.settings.maxRejectedPosts30d &&
    input.trust.validReportCount30d <= input.settings.maxValidReports30d;

  if (canAutoApprove) {
    reasonCodes.push(
      input.trust.communityTrusted
        ? "trusted_user_auto_approved"
        : "trusted_user_auto_approved"
    );
    return {
      decision: "auto_approved",
      postStatus: "approved",
      reasonCodes,
      matchedRules,
      trustScore: input.trust.score,
      userMessage: userMessageForDecision("auto_approved")
    };
  }

  if (input.trust.score < 30) {
    reasonCodes.push("low_trust_needs_review");
  } else {
    reasonCodes.push("low_trust_needs_review");
  }

  return {
    decision: "needs_review",
    postStatus: "pending",
    reasonCodes,
    matchedRules,
    trustScore: input.trust.score,
    userMessage: userMessageForDecision("needs_review")
  };
}

export function mapDecisionToPostFields(result: AutoModerationResult) {
  const now = new Date().toISOString();
  const base: Record<string, unknown> = {
    status: result.postStatus,
    auto_decision: result.decision,
    auto_decision_reason_codes: result.reasonCodes
  };

  if (result.decision === "auto_approved") {
    base.approved_at = now;
    base.published_at = now;
  }

  if (result.decision === "auto_rejected" || result.decision === "rate_limited") {
    base.rejected_reason = "Tự động: vi phạm quy định hoặc giới hạn đăng";
    base.rejection_reason_code = result.reasonCodes[0] ?? "policy";
    base.public_note = result.userMessage;
  }

  if (result.decision === "auto_hidden") {
    base.hidden_at = now;
    base.hidden_reason = "Tự động ẩn — từ khóa nghiêm trọng";
  }

  return base;
}
