import type {
  VerificationDashboardFilters,
  VerificationSummaryCardKey
} from "@/types/admin-verification";

const PAGE_SIZES = new Set([25, 50, 100]);

export function parseVerificationFilters(
  params: Record<string, string | string[] | undefined>
): VerificationDashboardFilters {
  const raw = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const pageSizeRaw = Number(raw("pageSize") ?? "25");
  const pageSize = PAGE_SIZES.has(pageSizeRaw)
    ? (pageSizeRaw as 25 | 50 | 100)
    : 25;

  return {
    query: raw("q")?.trim() ?? "",
    status: parseStatusFilter(raw("status")),
    verificationType: parseTypeFilter(raw("type")),
    source: parseSourceFilter(raw("source")),
    timeRange: parseTimeFilter(raw("time")),
    sort: parseSort(raw("sort")),
    summaryCard: parseSummaryCard(raw("card")),
    page: Math.max(1, Number(raw("page") ?? "1") || 1),
    pageSize,
    selectedId: raw("id") ?? null
  };
}

function parseStatusFilter(
  value: string | undefined
): VerificationDashboardFilters["status"] {
  const allowed = [
    "all",
    "pending",
    "approved",
    "rejected",
    "revoked",
    "needs_more_info"
  ] as const;
  return allowed.includes(value as (typeof allowed)[number])
    ? (value as VerificationDashboardFilters["status"])
    : "all";
}

function parseTypeFilter(
  value: string | undefined
): VerificationDashboardFilters["verificationType"] {
  const allowed = [
    "all",
    "author_verified",
    "official_account",
    "blue_tick",
    "organization",
    "partner",
    "admin_manual"
  ] as const;
  return allowed.includes(value as (typeof allowed)[number])
    ? (value as VerificationDashboardFilters["verificationType"])
    : "all";
}

function parseSourceFilter(
  value: string | undefined
): VerificationDashboardFilters["source"] {
  const allowed = ["all", "user_request", "admin_direct", "studio", "moderation"] as const;
  return allowed.includes(value as (typeof allowed)[number])
    ? (value as VerificationDashboardFilters["source"])
    : "all";
}

function parseTimeFilter(
  value: string | undefined
): VerificationDashboardFilters["timeRange"] {
  const allowed = ["all", "today", "7d", "30d"] as const;
  return allowed.includes(value as (typeof allowed)[number])
    ? (value as VerificationDashboardFilters["timeRange"])
    : "all";
}

function parseSort(value: string | undefined): VerificationDashboardFilters["sort"] {
  const allowed = [
    "newest",
    "oldest",
    "pending_longest",
    "revenue_priority",
    "follower_priority"
  ] as const;
  return allowed.includes(value as (typeof allowed)[number])
    ? (value as VerificationDashboardFilters["sort"])
    : "newest";
}

function parseSummaryCard(
  value: string | undefined
): VerificationSummaryCardKey | null {
  const allowed = [
    "pending",
    "approved",
    "blueTick",
    "officialAccount",
    "rejected",
    "revoked",
    "needsReview",
    "manualGranted7d"
  ] as const;
  return allowed.includes(value as VerificationSummaryCardKey)
    ? (value as VerificationSummaryCardKey)
    : null;
}

export function summaryCardToFilterPatch(
  key: VerificationSummaryCardKey
): Partial<VerificationDashboardFilters> {
  switch (key) {
    case "pending":
      return { status: "pending", page: 1, summaryCard: key };
    case "approved":
      return { status: "approved", page: 1, summaryCard: key };
    case "blueTick":
      return { verificationType: "blue_tick", status: "approved", page: 1, summaryCard: key };
    case "officialAccount":
      return {
        verificationType: "official_account",
        status: "approved",
        page: 1,
        summaryCard: key
      };
    case "rejected":
      return { status: "rejected", page: 1, summaryCard: key };
    case "revoked":
      return { status: "revoked", page: 1, summaryCard: key };
    case "needsReview":
      return { status: "needs_more_info", page: 1, summaryCard: key };
    case "manualGranted7d":
      return { source: "admin_direct", timeRange: "7d", page: 1, summaryCard: key };
    default:
      return { page: 1 };
  }
}

export function buildVerificationFilterQuery(
  filters: VerificationDashboardFilters
): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.verificationType !== "all") params.set("type", filters.verificationType);
  if (filters.source !== "all") params.set("source", filters.source);
  if (filters.timeRange !== "all") params.set("time", filters.timeRange);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.summaryCard) params.set("card", filters.summaryCard);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  if (filters.selectedId) params.set("id", filters.selectedId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function getDefaultVerificationFilters(
  pageSize: VerificationDashboardFilters["pageSize"] = 25
): VerificationDashboardFilters {
  return {
    query: "",
    status: "all",
    verificationType: "all",
    source: "all",
    timeRange: "all",
    sort: "newest",
    summaryCard: null,
    page: 1,
    pageSize,
    selectedId: null
  };
}
