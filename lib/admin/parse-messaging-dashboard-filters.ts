import type {
  MessagingAccountAgeFilter,
  MessagingDashboardFilters,
  MessagingDateRange,
  MessagingReportStatusFilter,
  MessagingRiskLevelFilter,
  MessagingRiskTab,
  MessagingRoleFilter,
  MessagingSafetyReasonFilter,
  MessagingSafetyStatusFilter
} from "@/types/admin-messaging";
import type { MessageReportReasonCode } from "@/types/messages";
import { messageReportReasons } from "@/types/messages";

const reportReasonSet = new Set(messageReportReasons.map((r) => r.value));

const TABS: MessagingRiskTab[] = [
  "overview",
  "reports",
  "risky",
  "blocked",
  "restrictions",
  "settings",
  "audit"
];

export function parseMessagingDashboardFilters(
  searchParams: Record<string, string | string[] | undefined>
): MessagingDashboardFilters {
  const pick = (key: string) => {
    const v = searchParams[key];
    return typeof v === "string" ? v : undefined;
  };

  const range = pick("range");
  const tab = pick("tab");

  return {
    range:
      range === "24h" || range === "7d" || range === "30d" || range === "all"
        ? range
        : "7d",
    tab: TABS.includes(tab as MessagingRiskTab) ? (tab as MessagingRiskTab) : "overview",
    reportReason: reportReasonSet.has(pick("reason") as MessageReportReasonCode)
      ? (pick("reason") as MessageReportReasonCode)
      : "all",
    reportStatus:
      pick("rStatus") === "open" ||
      pick("rStatus") === "reviewing" ||
      pick("rStatus") === "resolved" ||
      pick("rStatus") === "rejected"
        ? (pick("rStatus") as MessagingReportStatusFilter)
        : "all",
    riskLevel:
      pick("risk") === "low" ||
      pick("risk") === "medium" ||
      pick("risk") === "high" ||
      pick("risk") === "critical"
        ? (pick("risk") as MessagingRiskLevelFilter)
        : "all",
    safetyStatus:
      pick("sStatus") === "blocked" ||
      pick("sStatus") === "review" ||
      pick("sStatus") === "warning"
        ? (pick("sStatus") as MessagingSafetyStatusFilter)
        : "all",
    safetyReason:
      pick("sReason") === "spam_link" ||
      pick("sReason") === "scam" ||
      pick("sReason") === "profanity" ||
      pick("sReason") === "harassment" ||
      pick("sReason") === "external_contact"
        ? (pick("sReason") as MessagingSafetyReasonFilter)
        : "all",
    role:
      pick("role") === "creator" || pick("role") === "reader"
        ? (pick("role") as MessagingRoleFilter)
        : "all",
    accountAge: pick("age") === "new" ? "new" : "all",
    search: pick("q") ?? ""
  };
}

export function buildMessagingFilterQuery(
  filters: Partial<MessagingDashboardFilters>
): string {
  const params = new URLSearchParams();
  if (filters.tab) params.set("tab", filters.tab);
  if (filters.range) params.set("range", filters.range);
  if (filters.reportReason && filters.reportReason !== "all") {
    params.set("reason", filters.reportReason);
  }
  if (filters.reportStatus && filters.reportStatus !== "all") {
    params.set("rStatus", filters.reportStatus);
  }
  if (filters.riskLevel && filters.riskLevel !== "all") {
    params.set("risk", filters.riskLevel);
  }
  if (filters.safetyStatus && filters.safetyStatus !== "all") {
    params.set("sStatus", filters.safetyStatus);
  }
  if (filters.safetyReason && filters.safetyReason !== "all") {
    params.set("sReason", filters.safetyReason);
  }
  if (filters.role && filters.role !== "all") {
    params.set("role", filters.role);
  }
  if (filters.accountAge === "new") {
    params.set("age", "new");
  }
  if (filters.search?.trim()) {
    params.set("q", filters.search.trim());
  }
  const q = params.toString();
  return q ? `?${q}` : "";
}
