import { normalizeMessageText } from "@/lib/moderation/normalize-message-text";
import {
  KEYWORD_RULE_GROUPS,
  LINK_PATTERNS,
  RISKY_LINK_DOMAINS
} from "@/lib/moderation/message-keywords";
import type { MessageSafetyResult } from "@/types/messages";

export const MESSAGE_SAFETY_ERRORS = {
  blocked: "Tin nhắn có nội dung không phù hợp. Vui lòng chỉnh lại.",
  review: "Tin nhắn có nội dung không phù hợp. Vui lòng chỉnh lại.",
  linkFirst: "Không thể gửi link trong tin nhắn đầu tiên.",
  linkStranger: "Không thể gửi liên kết trong tin nhắn với người lạ."
} as const;

export const MESSAGE_SAFETY_WARNING =
  "Tin nhắn có thể gây khó chịu. Bạn muốn chỉnh lại không?";

export type MessageSafetyContext = {
  isFirstMessage?: boolean;
  isRequest?: boolean;
  senderAccountAgeHours?: number;
  areMutualFollowers?: boolean;
  containsLink?: boolean;
};

function matchesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

export function containsExternalLink(text: string) {
  const normalized = normalizeMessageText(text);
  return (
    matchesAny(normalized, LINK_PATTERNS) ||
    RISKY_LINK_DOMAINS.some((domain) => normalized.includes(domain))
  );
}

function hasRiskyLinkDomain(text: string) {
  const lower = text.toLowerCase();
  return RISKY_LINK_DOMAINS.some((domain) => lower.includes(domain));
}

function mergeSeverity(
  current: MessageSafetyResult["status"],
  next: MessageSafetyResult["status"]
): MessageSafetyResult["status"] {
  const rank = { clean: 0, warning: 1, review: 2, blocked: 3 } as const;
  return rank[next] > rank[current] ? next : current;
}

export function checkMessageSafety(
  text: string,
  context: MessageSafetyContext = {}
): MessageSafetyResult & { normalizedText: string } {
  const normalizedText = normalizeMessageText(text);

  if (!normalizedText) {
    return {
      status: "blocked",
      reasons: ["empty"],
      normalizedText
    };
  }

  const containsLink = context.containsLink ?? containsExternalLink(normalizedText);
  const reasons: string[] = [];
  let status: MessageSafetyResult["status"] = "clean";

  if (context.isFirstMessage || context.isRequest) {
    if (containsLink) {
      reasons.push("link_first_message");
      status = "blocked";
    }
  } else if (!context.areMutualFollowers && containsLink) {
    reasons.push("link_stranger");
    status = "blocked";
  } else if (containsLink && hasRiskyLinkDomain(normalizedText)) {
    reasons.push("risky_link");
    status = mergeSeverity(status, "warning");
  }

  for (const group of KEYWORD_RULE_GROUPS) {
    if (!matchesAny(normalizedText, group.patterns)) {
      continue;
    }
    reasons.push(group.id);
    if (group.severity === "blocked") {
      status = "blocked";
    } else if (group.severity === "review") {
      status = mergeSeverity(status, "review");
    } else if (group.severity === "warning") {
      status = mergeSeverity(status, "warning");
    }
  }

  if (
    matchesAny(normalizedText, LINK_PATTERNS) &&
    !reasons.includes("link_first_message") &&
    !reasons.includes("link_stranger")
  ) {
    if (!reasons.includes("spam_link")) {
      reasons.push("spam_link");
    }
    if (status === "clean") {
      status = hasRiskyLinkDomain(normalizedText) ? "warning" : "review";
    }
  }

  if (reasons.length === 0) {
    return { status: "clean", reasons: [], normalizedText };
  }

  return { status, reasons, normalizedText };
}
