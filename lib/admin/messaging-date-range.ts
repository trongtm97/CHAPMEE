import type { MessagingDateRange } from "@/types/admin-messaging";

export function sinceForRange(range: MessagingDateRange): string {
  if (range === "all") {
    return new Date(0).toISOString();
  }
  const hours = range === "24h" ? 24 : range === "7d" ? 24 * 7 : 24 * 30;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
