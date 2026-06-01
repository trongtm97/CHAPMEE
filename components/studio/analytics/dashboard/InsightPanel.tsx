import Link from "next/link";
import { studioPath } from "@/lib/studio/constants";
import { analyticsBtnGhost, analyticsCard } from "@/components/studio/analytics/dashboard/shared/styles";
import type { StudioAnalyticsInsight } from "@/types/studio-analytics";

type InsightPanelProps = {
  insights: StudioAnalyticsInsight[];
  totalHealthIssues: number;
};

const toneBorder = {
  info: "border-cyan-400/25 bg-cyan-400/5",
  success: "border-emerald-400/25 bg-emerald-400/5",
  warning: "border-amber-400/25 bg-amber-400/5"
};

export function InsightPanel({ insights, totalHealthIssues }: InsightPanelProps) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <section className={`${analyticsCard} p-4 sm:p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-white">Hôm nay nên chú ý</h2>
        {totalHealthIssues > 5 ? (
          <Link
            className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            href={studioPath("/content-health")}
          >
            Xem tất cả việc cần xử lý
          </Link>
        ) : null}
      </div>

      <ul className="mt-4 space-y-2">
        {insights.map((insight) => (
          <li
            className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${
              toneBorder[insight.tone ?? "info"]
            }`}
            key={insight.id}
          >
            <p className="text-sm text-zinc-200">{insight.message}</p>
            <Link className={analyticsBtnGhost} href={insight.ctaHref}>
              {insight.ctaLabel}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
