import type { CreatorFeePolicyDashboardFilters } from "@/types/admin-creator-fee-policy";

export function getDefaultCreatorFeePolicyFilters(
  pageSize = 20
): CreatorFeePolicyDashboardFilters {
  return {
    search: "",
    status: "all",
    creatorType: "all",
    revenueSource: "all",
    effective: "all",
    sort: "newest",
    page: 1,
    pageSize,
    selectedPolicyId: null,
    selectedCreatorId: null,
    createMode: false
  };
}

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string {
  const v = params[key];
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export function parseCreatorFeePolicyFilters(
  params: Record<string, string | string[] | undefined>
): CreatorFeePolicyDashboardFilters {
  const defaults = getDefaultCreatorFeePolicyFilters();
  const page = Math.max(1, Number(readParam(params, "page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(10, Number(readParam(params, "pageSize")) || defaults.pageSize)
  );

  return {
    search: readParam(params, "q"),
    status: (readParam(params, "status") || "all") as CreatorFeePolicyDashboardFilters["status"],
    creatorType: (readParam(params, "creatorType") ||
      "all") as CreatorFeePolicyDashboardFilters["creatorType"],
    revenueSource: (readParam(params, "source") ||
      "all") as CreatorFeePolicyDashboardFilters["revenueSource"],
    effective: (readParam(params, "effective") ||
      "all") as CreatorFeePolicyDashboardFilters["effective"],
    sort: (readParam(params, "sort") || "newest") as CreatorFeePolicyDashboardFilters["sort"],
    page,
    pageSize,
    selectedPolicyId: readParam(params, "policy") || null,
    selectedCreatorId: readParam(params, "creator") || null,
    createMode: readParam(params, "create") === "1"
  };
}

export function buildCreatorFeePolicyFilterQuery(
  filters: CreatorFeePolicyDashboardFilters
): string {
  const q = new URLSearchParams();
  if (filters.search.trim()) q.set("q", filters.search.trim());
  if (filters.status !== "all") q.set("status", filters.status);
  if (filters.creatorType !== "all") q.set("creatorType", filters.creatorType);
  if (filters.revenueSource !== "all") q.set("source", filters.revenueSource);
  if (filters.effective !== "all") q.set("effective", filters.effective);
  if (filters.sort !== "newest") q.set("sort", filters.sort);
  if (filters.page > 1) q.set("page", String(filters.page));
  if (filters.pageSize !== 20) q.set("pageSize", String(filters.pageSize));
  if (filters.selectedPolicyId) q.set("policy", filters.selectedPolicyId);
  if (filters.selectedCreatorId) q.set("creator", filters.selectedCreatorId);
  if (filters.createMode) q.set("create", "1");
  const s = q.toString();
  return s ? `?${s}` : "";
}
