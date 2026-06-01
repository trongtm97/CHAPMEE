import type { RankingTimeWindow } from "@/types/ranking-board";

export function windowStartDate(window: RankingTimeWindow): string | null {
  const now = new Date();
  if (window === "all_time") return null;

  if (window === "day") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }

  const days = window === "week" ? 7 : 30;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function mapUiPeriodToWindow(
  period: "today" | "week" | "month"
): RankingTimeWindow {
  if (period === "today") return "day";
  if (period === "month") return "month";
  return "week";
}

export function mapWindowToUiPeriod(window: RankingTimeWindow) {
  if (window === "day") return "today" as const;
  if (window === "month") return "month" as const;
  return "week" as const;
}
