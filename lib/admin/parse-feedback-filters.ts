import type { FeedbackDashboardFilters } from "@/types/admin-feedback";

export type FeedbackListFilters = FeedbackDashboardFilters;

export function getDefaultFeedbackFilters(pageSize = 20): FeedbackDashboardFilters {
  return {
    search: "",
    status: "all",
    category: "all",
    priority: "all",
    hasScreenshot: "all",
    assignee: "all",
    page: 1,
    pageSize
  };
}

export function parseFeedbackDashboardFilters(
  query: Record<string, string | string[] | undefined>
): FeedbackDashboardFilters {
  const pick = (key: string) => {
    const value = query[key];
    return typeof value === "string" ? value : undefined;
  };

  return {
    search: pick("q") ?? "",
    status: (pick("status") as FeedbackDashboardFilters["status"]) ?? "all",
    category: pick("category") ?? "all",
    priority: (pick("priority") as FeedbackDashboardFilters["priority"]) ?? "all",
    hasScreenshot: (pick("screenshot") as FeedbackDashboardFilters["hasScreenshot"]) ?? "all",
    assignee: (pick("assignee") as FeedbackDashboardFilters["assignee"]) ?? "all",
    from: pick("from"),
    to: pick("to"),
    userId: pick("user"),
    page: Math.max(1, Number(pick("page") ?? 1) || 1),
    pageSize: 20,
    selectedFeedbackId: pick("id")
  };
}

export function buildFeedbackFilterQuery(filters: FeedbackDashboardFilters) {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.category !== "all") params.set("category", String(filters.category));
  if (filters.priority !== "all") params.set("priority", filters.priority);
  if (filters.hasScreenshot !== "all") params.set("screenshot", filters.hasScreenshot);
  if (filters.assignee !== "all") params.set("assignee", filters.assignee);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.userId) params.set("user", filters.userId);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.selectedFeedbackId) params.set("id", filters.selectedFeedbackId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
