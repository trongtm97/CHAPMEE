import type {
  TransactionDashboardFilters,
  TransactionSortOption,
  TransactionSourceFilter,
  TransactionStatusFilter,
  TransactionTypeFilter
} from "@/types/admin-transaction";
import { TRANSACTION_PAGE_SIZE_OPTIONS } from "@/lib/admin/transactions/transaction-labels";

export function getDefaultTransactionFilters(
  pageSize: TransactionDashboardFilters["pageSize"] = 25
): TransactionDashboardFilters {
  return {
    search: "",
    type: "all",
    status: "all",
    source: "all",
    startDate: "",
    endDate: "",
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

export function parseTransactionFilters(
  params: Record<string, string | string[] | undefined>
): TransactionDashboardFilters {
  const get = (key: string) => {
    const raw = params[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };

  const pageSizeRaw = Number(get("pageSize") ?? "25");
  const pageSize = TRANSACTION_PAGE_SIZE_OPTIONS.includes(
    pageSizeRaw as (typeof TRANSACTION_PAGE_SIZE_OPTIONS)[number]
  )
    ? (pageSizeRaw as TransactionDashboardFilters["pageSize"])
    : 25;

  return {
    search: get("search")?.trim() ?? "",
    type: parseEnum(get("type"), TYPE_FILTER_VALUES, "all"),
    status: parseEnum(get("status"), STATUS_FILTER_VALUES, "all"),
    source: parseEnum(get("source"), SOURCE_FILTER_VALUES, "all"),
    startDate: get("start") ?? get("startDate") ?? "",
    endDate: get("end") ?? get("endDate") ?? "",
    sort: parseEnum(get("sort"), SORT_VALUES, "newest"),
    page: Math.max(1, Number(get("page") ?? "1") || 1),
    pageSize,
    selectedId: get("id") ?? null
  };
}

export function buildTransactionFilterQuery(filters: TransactionDashboardFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.source !== "all") params.set("source", filters.source);
  if (filters.startDate) params.set("start", filters.startDate);
  if (filters.endDate) params.set("end", filters.endDate);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  if (filters.selectedId) params.set("id", filters.selectedId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function mapTypeFilterToDbTypes(type: TransactionTypeFilter): string[] | null {
  switch (type) {
    case "all":
      return null;
    case "chapter_purchase":
      return ["chapter_unlock", "story_unlock"];
    case "early_access":
      return ["chapter_unlock", "story_unlock"];
    case "coin_reward":
      return ["bonus_coin_grant", "rewarded_ad_coin", "creator_bonus"];
    case "payout":
      return ["payout_request", "payout_completed"];
    case "chargeback":
      return ["chargeback"];
    default:
      return [type];
  }
}

export function mapSourceFilterToQuery(source: TransactionSourceFilter) {
  return source;
}

const TYPE_FILTER_VALUES = [
  "all",
  "coin_purchase",
  "chapter_purchase",
  "author_tip",
  "virtual_gift",
  "early_access",
  "vip_subscription",
  "fan_club_subscription",
  "coin_reward",
  "admin_coin_adjustment",
  "refund",
  "payout",
  "chargeback",
  "platform_fee"
] as const satisfies readonly TransactionTypeFilter[];

const STATUS_FILTER_VALUES = [
  "all",
  "pending",
  "completed",
  "failed",
  "refunded",
  "partial_refund",
  "reversed",
  "chargeback",
  "needs_review"
] as const satisfies readonly TransactionStatusFilter[];

const SOURCE_FILTER_VALUES = [
  "all",
  "sepay",
  "apple_iap",
  "google_play",
  "admin",
  "system",
  "internal_wallet"
] as const satisfies readonly TransactionSourceFilter[];

const SORT_VALUES = [
  "newest",
  "oldest",
  "amount_high",
  "amount_low",
  "coin_high",
  "coin_low"
] as const satisfies readonly TransactionSortOption[];
