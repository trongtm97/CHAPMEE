import type {
  PublishChecklistResult,
  PublishChecklistRule,
  PublishChecklistRuleStatus,
  PublishChecklistTargetType
} from "@/types/publish-checklist";

export function createRule(input: {
  id: string;
  label: string;
  ok: boolean;
  message?: string;
  targetType: PublishChecklistTargetType;
  blocking?: boolean;
  warnIfFail?: boolean;
}): PublishChecklistRule {
  const blocking = input.blocking ?? true;
  const warnIfFail = input.warnIfFail ?? false;

  let status: PublishChecklistRuleStatus = "pass";
  let ruleBlocking = false;

  if (!input.ok) {
    if (warnIfFail || !blocking) {
      status = "warning";
      ruleBlocking = false;
    } else {
      status = "error";
      ruleBlocking = true;
    }
  }

  return {
    blocking: ruleBlocking,
    id: input.id,
    label: input.label,
    message:
      input.message ??
      (input.ok ? "Đã đạt." : input.label),
    status,
    targetType: input.targetType
  };
}

export function summarizeChecklist(rules: PublishChecklistRule[]): PublishChecklistResult {
  const hasBlockingErrors = rules.some(
    (rule) => rule.status === "error" && rule.blocking
  );
  const hasWarnings = rules.some((rule) => rule.status === "warning");

  return {
    hasBlockingErrors,
    hasWarnings,
    ok: !hasBlockingErrors,
    rules
  };
}

function ruleSeverity(rule: PublishChecklistRule) {
  if (rule.status === "error") {
    return 3;
  }

  if (rule.status === "warning") {
    return 2;
  }

  return 1;
}

export function mergeChecklistResults(
  ...results: PublishChecklistResult[]
): PublishChecklistResult {
  const byKey = new Map<string, PublishChecklistRule>();

  for (const result of results) {
    for (const rule of result.rules) {
      const key = `${rule.targetType}:${rule.id}`;
      const existing = byKey.get(key);

      if (!existing || ruleSeverity(rule) > ruleSeverity(existing)) {
        byKey.set(key, rule);
      }
    }
  }

  return summarizeChecklist([...byKey.values()]);
}

export function blockingErrorMessages(rules: PublishChecklistRule[]): string[] {
  return rules
    .filter((rule) => rule.status === "error" && rule.blocking)
    .map((rule) => rule.message || rule.label);
}

export function formatBlockingErrors(rules: PublishChecklistRule[]): string {
  const messages = blockingErrorMessages(rules);
  return messages.length > 0
    ? messages.join(" ")
    : "Nội dung chưa đủ điều kiện để đăng.";
}

export function isStoryStatusBlockedForPublish(status: string | null | undefined) {
  return (
    status === "rejected" ||
    status === "archived" ||
    status === "pending"
  );
}

export function isEpisodeStatusBlockedForPublish(status: string | null | undefined) {
  return status === "rejected";
}

export function isStoryHiddenForPublish(
  status: string | null | undefined,
  visibility: string | null | undefined
) {
  return (
    visibility === "private" ||
    visibility === "unlisted" ||
    status === "archived"
  );
}
