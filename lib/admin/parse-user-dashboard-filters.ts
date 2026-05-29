import type { UserDashboardFilters } from "@/types/admin-user";

export function parseUserDashboardFilters(
  searchParams: Record<string, string | string[] | undefined>
): UserDashboardFilters {
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
    role: (pick("role") as UserDashboardFilters["role"]) ?? "all",
    status: (pick("status") as UserDashboardFilters["status"]) ?? "all",
    accountType: (pick("acct") as UserDashboardFilters["accountType"]) ?? "all",
    timeRange: (pick("time") as UserDashboardFilters["timeRange"]) ?? "all",
    sort: (pick("sort") as UserDashboardFilters["sort"]) ?? "newest",
    page: Math.max(1, Number(pick("page")) || 1),
    pageSize,
    selectedUserId: pick("user")
  };
}

export function buildUserFilterQuery(
  filters: Partial<UserDashboardFilters>
): string {
  const params = new URLSearchParams();
  if (filters.query?.trim()) params.set("q", filters.query.trim());
  if (filters.role && filters.role !== "all") params.set("role", filters.role);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.accountType && filters.accountType !== "all") {
    params.set("acct", filters.accountType);
  }
  if (filters.timeRange && filters.timeRange !== "all") {
    params.set("time", filters.timeRange);
  }
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize && filters.pageSize !== 25) {
    params.set("size", String(filters.pageSize));
  }
  if (filters.selectedUserId) params.set("user", filters.selectedUserId);
  const q = params.toString();
  return q ? `?${q}` : "";
}
