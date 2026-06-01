import { normalizeMessageText } from "@/lib/moderation/normalize-message-text";
import {
  checkMessageSafety as checkStaticSafety,
  containsExternalLink,
  type MessageSafetyContext
} from "@/lib/moderation/message-safety";
import { getActiveKeywordRules } from "@/lib/messaging/get-keyword-rules";
import { getMessageSafetySettings } from "@/lib/messaging/get-message-safety-settings";
import { getActiveMessagingRestrictions } from "@/lib/messaging/get-active-messaging-restriction";
import {
  hasLinkBlockOnly,
  hasMuteRestriction
} from "@/lib/messaging/messaging-restriction-helpers";
import type { MessageSafetyRiskLevel } from "@/types/messaging-safety";
import type { MessageSafetyResult } from "@/types/messages";

export const USER_FACING_BLOCKED =
  "Tin nhắn không thể gửi vì có nội dung hoặc liên kết không phù hợp.";

export const USER_FACING_REVIEW =
  "Tin nhắn cần được kiểm tra.";

export type FullSafetyCheckInput = {
  senderId: string;
  recipientId: string;
  body: string;
  conversationId?: string | null;
  accountCreatedAt?: string;
  isVerified?: boolean;
  isTrusted?: boolean;
  recipientIsAuthor?: boolean;
  isFirstMessage?: boolean;
  isRequest?: boolean;
  areMutualFollowers?: boolean;
};

export type FullSafetyCheckResult = {
  allowed: boolean;
  status: MessageSafetyResult["status"] | "rate_limited";
  reasons: string[];
  riskLevel: MessageSafetyRiskLevel;
  userMessage: string | null;
  decision: "allowed" | "blocked" | "needs_review" | "rate_limited";
};

function mergeRisk(
  current: MessageSafetyRiskLevel,
  next: MessageSafetyRiskLevel
): MessageSafetyRiskLevel {
  const rank = { low: 0, medium: 1, high: 2, critical: 3 } as const;
  return rank[next] > rank[current] ? next : current;
}

function isInternalLink(text: string) {
  const lower = text.toLowerCase();
  return (
    lower.includes("chapmee") ||
    lower.includes("/stories/") ||
    lower.includes("/profile/") ||
    lower.includes("/me/")
  );
}

function accountAgeDays(createdAt?: string) {
  if (!createdAt) return 999;
  return (Date.now() - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000);
}

export async function runMessageSafetyCheck(
  input: FullSafetyCheckInput
): Promise<FullSafetyCheckResult> {
  const settings = await getMessageSafetySettings();
  const restrictions = await getActiveMessagingRestrictions(input.senderId);
  const reasons: string[] = [];
  let riskLevel: MessageSafetyRiskLevel = "low";

  if (!settings.enabled) {
    return {
      allowed: true,
      status: "clean",
      reasons: [],
      riskLevel: "low",
      userMessage: null,
      decision: "allowed"
    };
  }

  if (hasMuteRestriction(restrictions)) {
    return {
      allowed: false,
      status: "blocked",
      reasons: ["user_restricted"],
      riskLevel: "high",
      userMessage: null,
      decision: "blocked"
    };
  }

  const body = input.body.trim();
  const normalized = normalizeMessageText(body);
  const hasLink = containsExternalLink(body);
  const ageDays = accountAgeDays(input.accountCreatedAt);
  const isNewAccount = ageDays < settings.newAccountDays;

  if (hasLinkBlockOnly(restrictions) && hasLink) {
    return {
      allowed: false,
      status: "blocked",
      reasons: ["user_restricted", "external_link_blocked"],
      riskLevel: "medium",
      userMessage: USER_FACING_BLOCKED,
      decision: "blocked"
    };
  }

  if (
    settings.authorProtectionEnabled &&
    input.recipientIsAuthor &&
    isNewAccount
  ) {
    reasons.push("author_protection");
    riskLevel = mergeRisk(riskLevel, "medium");
  }

  if (hasLink) {
    const chapMeeLinkAllowed =
      settings.allowInternalLinks && isInternalLink(body);
    if (
      isNewAccount &&
      settings.blockExternalLinksForNewUsers &&
      !chapMeeLinkAllowed
    ) {
      return {
        allowed: false,
        status: "blocked",
        reasons: ["external_link_blocked", "new_account_limit"],
        riskLevel: "medium",
        userMessage: USER_FACING_BLOCKED,
        decision: "blocked"
      };
    }
    if (
      !input.isVerified &&
      settings.blockExternalLinksForUnverified &&
      !chapMeeLinkAllowed
    ) {
      return {
        allowed: false,
        status: "blocked",
        reasons: ["external_link_blocked", "unverified_limit"],
        riskLevel: "medium",
        userMessage: USER_FACING_BLOCKED,
        decision: "blocked"
      };
    }
  }

  const keywordRules = await getActiveKeywordRules();
  for (const rule of keywordRules) {
    if (!normalized.includes(normalizeMessageText(rule.keyword))) {
      continue;
    }
    reasons.push(
      rule.action === "block"
        ? "blocked_keyword"
        : rule.action === "review"
          ? "review_keyword"
          : "allow_keyword"
    );
    riskLevel = mergeRisk(riskLevel, rule.severity);
    if (rule.action === "block") {
      return {
        allowed: false,
        status: "blocked",
        reasons,
        riskLevel,
        userMessage: USER_FACING_BLOCKED,
        decision: "blocked"
      };
    }
    if (rule.action === "review") {
      return {
        allowed: false,
        status: "review",
        reasons,
        riskLevel,
        userMessage: USER_FACING_REVIEW,
        decision: "needs_review"
      };
    }
  }

  const ctx: MessageSafetyContext = {
    isFirstMessage: input.isFirstMessage,
    isRequest: input.isRequest,
    senderAccountAgeHours: ageDays * 24,
    areMutualFollowers: input.areMutualFollowers,
    containsLink: hasLink
  };

  const staticResult = checkStaticSafety(body, ctx);
  if (staticResult.status === "blocked") {
    return {
      allowed: false,
      status: "blocked",
      reasons: [...reasons, ...staticResult.reasons],
      riskLevel: mergeRisk(riskLevel, "high"),
      userMessage: USER_FACING_BLOCKED,
      decision: "blocked"
    };
  }

  if (staticResult.status === "review") {
    return {
      allowed: false,
      status: "review",
      reasons: [...reasons, ...staticResult.reasons],
      riskLevel: mergeRisk(riskLevel, "medium"),
      userMessage: USER_FACING_REVIEW,
      decision: "needs_review"
    };
  }

  if (staticResult.status === "warning") {
    return {
      allowed: true,
      status: "warning",
      reasons: staticResult.reasons,
      riskLevel: mergeRisk(riskLevel, "low"),
      userMessage: null,
      decision: "allowed"
    };
  }

  return {
    allowed: true,
    status: "clean",
    reasons,
    riskLevel,
    userMessage: null,
    decision: "allowed"
  };
}
