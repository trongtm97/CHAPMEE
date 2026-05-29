import type { WithdrawalDashboardFilters } from "@/types/admin-withdrawal";
import { WITHDRAWAL_PAGE_SIZE_OPTIONS } from "@/lib/admin/withdrawals/withdrawal-labels";

export function getDefaultWithdrawalFilters(
  pageSize: WithdrawalDashboardFilters["pageSize"] = 25
): WithdrawalDashboardFilters {
  return {
    search: "",
    status: "all",
    method: "all",
    risk: "all",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
    sort: "newest",
    page: 1,
    pageSize,
    selectedId: null
  };
}

function parseEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  if (value && allowed.includes(value as T)) return value as T;
  return fallback;
}

const STATUS_VALUES = [
  "all",
  "pending",
  "approved",
  "processing",
  "paid",
  "rejected",
  "failed",
  "cancelled"
] as const;

const METHOD_VALUES = ["all", "bank_transfer", "momo", "zalopay", "manual"] as const;
const RISK_VALUES = ["all", "normal", "warning", "high"] as const;
const SORT_VALUES = ["newest", "oldest", "amount_desc", "amount_asc"] as const;

export function parseWithdrawalFilters(
  params: Record<string, string | string[] | undefined>
): WithdrawalDashboardFilters {
  const get = (key: string) => {
    const raw = params[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };

  const pageSizeRaw = Number(get("pageSize") ?? "25");
  const pageSize = WITHDRAWAL_PAGE_SIZE_OPTIONS.includes(
    pageSizeRaw as (typeof WITHDRAWAL_PAGE_SIZE_OPTIONS)[number]
  )
    ? (pageSizeRaw as WithdrawalDashboardFilters["pageSize"])
    : 25;

  return {
    search: get("search")?.trim() ?? "",
    status: parseEnum(get("status"), STATUS_VALUES, "all"),
    method: parseEnum(get("method"), METHOD_VALUES, "all"),
    risk: parseEnum(get("risk"), RISK_VALUES, "all"),
    startDate: get("start") ?? get("startDate") ?? "",
    endDate: get("end") ?? get("endDate") ?? "",
    minAmount: get("minAmount") ?? "",
    maxAmount: get("maxAmount") ?? "",
    sort: parseEnum(get("sort"), SORT_VALUES, "newest"),
    page: Math.max(1, Number(get("page") ?? "1") || 1),
    pageSize,
    selectedId: get("id") ?? null
  };
}

export function buildWithdrawalFilterQuery(filters: WithdrawalDashboardFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.method !== "all") params.set("method", filters.method);
  if (filters.risk !== "all") params.set("risk", filters.risk);
  if (filters.startDate) params.set("start", filters.startDate);
  if (filters.endDate) params.set("end", filters.endDate);
  if (filters.minAmount) params.set("minAmount", filters.minAmount);
  if (filters.maxAmount) params.set("maxAmount", filters.maxAmount);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  if (filters.selectedId) params.set("id", filters.selectedId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
