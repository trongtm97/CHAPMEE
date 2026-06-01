import type { PolicyStatus, PolicyType } from "@/types/policy-pages";

export type PolicyListFilters = {
  search: string;
  status: PolicyStatus | "all";
  policyType: PolicyType | "all";
  page: number;
  pageSize: number;
};

export const DEFAULT_POLICY_PAGE_SIZE = 20;

export function getDefaultPolicyListFilters(): PolicyListFilters {
  return {
    search: "",
    status: "all",
    policyType: "all",
    page: 1,
    pageSize: DEFAULT_POLICY_PAGE_SIZE
  };
}

export function parsePolicyListFilters(
  query: Record<string, string | string[] | undefined>
): PolicyListFilters {
  const defaults = getDefaultPolicyListFilters();
  const pageRaw = Number(Array.isArray(query.page) ? query.page[0] : query.page ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const statusRaw = String(Array.isArray(query.status) ? query.status[0] : query.status ?? "all");
  const typeRaw = String(Array.isArray(query.type) ? query.type[0] : query.type ?? "all");
  const search = String(Array.isArray(query.q) ? query.q[0] : query.q ?? "").trim();

  const validStatuses = new Set(["all", "draft", "published", "archived"]);
  const validTypes = new Set([
    "all",
    "account",
    "content",
    "creator",
    "monetization",
    "community",
    "privacy",
    "advertising"
  ]);

  return {
    search,
    status: validStatuses.has(statusRaw) ? (statusRaw as PolicyListFilters["status"]) : defaults.status,
    policyType: validTypes.has(typeRaw)
      ? (typeRaw as PolicyListFilters["policyType"])
      : defaults.policyType,
    page,
    pageSize: defaults.pageSize
  };
}

export function buildPolicyListQuery(filters: PolicyListFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.policyType !== "all") params.set("type", filters.policyType);
  if (filters.page > 1) params.set("page", String(filters.page));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
