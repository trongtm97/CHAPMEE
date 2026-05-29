import type {
  CreatorDashboardFilters,
  CreatorFinanceFilter,
  CreatorMonetizationFilter,
  CreatorQualityFilter,
  CreatorSortOption,
  CreatorStudioFilter,
  CreatorSummaryCardKey,
  CreatorVerificationFilter
} from "@/types/admin-creator";

export function parseCreatorDashboardFilters(
  searchParams: Record<string, string | string[] | undefined>
): CreatorDashboardFilters {
  const pick = (key: string) => {
    const v = searchParams[key];
    return typeof v === "string" ? v : undefined;
  };

  const pageSizeRaw = Number(pick("size"));
  const pageSize =
    pageSizeRaw === 25 || pageSizeRaw === 50 || pageSizeRaw === 100
      ? pageSizeRaw
      : 25;

  return {
    query: pick("q") ?? "",
    studio: (pick("studio") as CreatorStudioFilter) ?? "all",
    monetization: (pick("mon") as CreatorMonetizationFilter) ?? "all",
    verification: (pick("ver") as CreatorVerificationFilter) ?? "all",
    quality: (pick("qual") as CreatorQualityFilter) ?? "all",
    finance: (pick("fin") as CreatorFinanceFilter) ?? "all",
    sort: (pick("sort") as CreatorSortOption) ?? "newest",
    page: Math.max(1, Number(pick("page")) || 1),
    pageSize,
    selectedUserId: pick("user"),
    summaryCard: pick("card") as CreatorSummaryCardKey | undefined
  };
}

export function buildCreatorFilterQuery(
  filters: Partial<CreatorDashboardFilters>
): string {
  const params = new URLSearchParams();
  if (filters.query?.trim()) params.set("q", filters.query.trim());
  if (filters.studio && filters.studio !== "all") params.set("studio", filters.studio);
  if (filters.monetization && filters.monetization !== "all") {
    params.set("mon", filters.monetization);
  }
  if (filters.verification && filters.verification !== "all") {
    params.set("ver", filters.verification);
  }
  if (filters.quality && filters.quality !== "all") params.set("qual", filters.quality);
  if (filters.finance && filters.finance !== "all") params.set("fin", filters.finance);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize && filters.pageSize !== 25) {
    params.set("size", String(filters.pageSize));
  }
  if (filters.selectedUserId) params.set("user", filters.selectedUserId);
  if (filters.summaryCard) params.set("card", filters.summaryCard);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export function summaryCardToFilterPatch(
  card: CreatorSummaryCardKey
): Partial<CreatorDashboardFilters> {
  const map: Partial<Record<CreatorSummaryCardKey, Partial<CreatorDashboardFilters>>> = {
    totalCreators: { studio: "all", monetization: "all" },
    activeStudios: { studio: "active" },
    pendingMonetization: { monetization: "pending_review" },
    monetizationEnabled: { monetization: "approved" },
    monetizationSuspended: { monetization: "suspended" },
    pendingVerification: { verification: "pending" },
    blueTick: { verification: "blue_tick" },
    pendingPayoutRequests: { finance: "pending_payout" },
    lowQualityContent: { quality: "low_quality" },
    warnedCreators: { quality: "warned" }
  };
  return { ...map[card], summaryCard: card, page: 1 };
}
