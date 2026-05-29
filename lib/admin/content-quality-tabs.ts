import type {
  AdminContentQualityQueueItem,
  AdminContentQualityTab,
  ContentQualityRiskLevel
} from "@/types/admin";
import type { ContentQualityStatus } from "@/types/content-quality";

const WAITING_AUTHOR_STATUSES: ContentQualityStatus[] = [
  "low_quality_warning_1",
  "low_quality_warning_2",
  "low_quality_final_review"
];

const PENDING_REVIEW_STATUSES: ContentQualityStatus[] = [
  "needs_attention",
  "pending_quality_review"
];

export function deriveRiskLevel(
  attemptCount: number,
  status: ContentQualityStatus
): ContentQualityRiskLevel {
  if (status === "permanently_hidden_low_quality") return "critical";
  if (attemptCount >= 3 || status === "low_quality_final_review") return "critical";
  if (attemptCount >= 2) return "high";
  if (attemptCount >= 1 || WAITING_AUTHOR_STATUSES.includes(status)) return "medium";
  return "low";
}

export function matchesQualityTab(
  tab: AdminContentQualityTab,
  item: AdminContentQualityQueueItem
) {
  const { qualityStatus, appealStatus, attemptCount } = item;

  if (tab === "all") return qualityStatus !== "good";

  if (tab === "appealing") {
    return qualityStatus === "appealed" || appealStatus === "pending";
  }

  if (tab === "waiting_author") {
    return WAITING_AUTHOR_STATUSES.includes(qualityStatus);
  }

  if (tab === "pending_review") {
    return (
      PENDING_REVIEW_STATUSES.includes(qualityStatus) ||
      (qualityStatus === "appealed" && appealStatus !== "pending")
    );
  }

  if (tab === "at_risk") {
    return (
      attemptCount >= 2 &&
      qualityStatus !== "permanently_hidden_low_quality" &&
      qualityStatus !== "restored"
    );
  }

  if (tab === "restored") {
    return qualityStatus === "restored";
  }

  if (tab === "permanently_hidden") {
    return qualityStatus === "permanently_hidden_low_quality";
  }

  return false;
}

export function buildQualitySummary(items: AdminContentQualityQueueItem[]) {
  const summary = {
    pendingReview: 0,
    waitingAuthor: 0,
    appealing: 0,
    atRisk: 0,
    restored: 0,
    permanentlyHidden: 0,
    monetizationDisabled: 0,
    processedToday: 0
  };

  for (const item of items) {
    if (matchesQualityTab("pending_review", item)) summary.pendingReview += 1;
    if (matchesQualityTab("waiting_author", item)) summary.waitingAuthor += 1;
    if (matchesQualityTab("appealing", item)) summary.appealing += 1;
    if (matchesQualityTab("at_risk", item)) summary.atRisk += 1;
    if (matchesQualityTab("restored", item)) summary.restored += 1;
    if (matchesQualityTab("permanently_hidden", item)) summary.permanentlyHidden += 1;
    if (item.monetizationDisabled) summary.monetizationDisabled += 1;
  }

  return summary;
}
