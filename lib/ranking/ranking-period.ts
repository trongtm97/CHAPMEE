import type { OriginRankingPeriod } from "@/lib/ranking/ranking-types";
import { windowStartDate } from "@/lib/ranking/window";

export { mapUiPeriodToWindow, mapWindowToUiPeriod, windowStartDate } from "@/lib/ranking/window";

export function periodDays(period: OriginRankingPeriod): number | null {
  if (period === "day") return 1;
  if (period === "week") return 7;
  if (period === "month") return 30;
  return null;
}

export function priorPeriodStartDate(period: OriginRankingPeriod): string | null {
  const currentStart = windowStartDate(period);
  if (!currentStart) return null;

  const days = periodDays(period);
  if (!days) return null;

  const d = new Date(currentStart);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function activityIso(
  publishedAt: string | null | undefined,
  updatedAt: string | null | undefined,
  createdAt?: string | null
): string | null {
  return updatedAt ?? publishedAt ?? createdAt ?? null;
}

/** Freshness decay multiplier by period — shorter windows reward recency more. */
export function periodFreshnessMultiplier(period: OriginRankingPeriod): number {
  if (period === "day") return 1.15;
  if (period === "week") return 1.0;
  if (period === "month") return 0.92;
  return 0.85;
}
