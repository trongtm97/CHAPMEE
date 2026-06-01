import { MetricTooltip } from "@/components/admin/taxonomy-analytics/MetricTooltip";
import {
  formatMetricNumber,
  formatMetricPct,
  metricTone
} from "@/components/admin/taxonomy-analytics/formatters";
import type { TaxonomyAnalyticsPageData } from "@/types/taxonomy-analytics";

type TaxonomyKpiGridProps = {
  summary: TaxonomyAnalyticsPageData["summary"];
};

export function TaxonomyKpiGrid({ summary }: TaxonomyKpiGridProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
        <p className="text-xs uppercase text-zinc-400">
          <MetricTooltip
            description="Tổng số lần taxonomy được hiển thị trên các surface."
            label="A - Reach · Impressions"
          />
        </p>
        <p className="mt-2 text-2xl font-bold">{formatMetricNumber(summary.impressions)}</p>
        <p className={`text-xs ${metricTone(summary.impressionsDeltaPct)}`}>
          {formatMetricPct(summary.impressionsDeltaPct)}
        </p>
      </div>
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
        <p className="text-xs uppercase text-zinc-400">
          <MetricTooltip
            description="Tỷ lệ hoàn thành đọc theo taxonomy trong kỳ lọc."
            label="B - Reading · Completion"
          />
        </p>
        <p className="mt-2 text-2xl font-bold">{formatMetricPct(summary.completionRate)}</p>
        <p className={`text-xs ${metricTone(summary.completionRateDeltaPct)}`}>
          {formatMetricPct(summary.completionRateDeltaPct)}
        </p>
      </div>
      <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-4">
        <p className="text-xs uppercase text-zinc-400">
          <MetricTooltip
            description="Doanh thu coin gắn với taxonomy trong kỳ."
            label="C - Business · Revenue"
          />
        </p>
        <p className="mt-2 text-2xl font-bold">{formatMetricNumber(summary.revenueCoin)}</p>
        <p className={`text-xs ${metricTone(summary.revenueCoinDeltaPct)}`}>
          {formatMetricPct(summary.revenueCoinDeltaPct)}
        </p>
      </div>
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
        <p className="text-xs uppercase text-zinc-400">
          <MetricTooltip
            description="Số report sai tag; chỉ để vận hành, không tự động xử phạt."
            label="D - Risk · Wrong tag reports"
          />
        </p>
        <p className="mt-2 text-2xl font-bold">{formatMetricNumber(summary.reportsWrongTag)}</p>
        <p className={`text-xs ${metricTone(summary.reportsWrongTagDeltaPct)}`}>
          {formatMetricPct(summary.reportsWrongTagDeltaPct)}
        </p>
      </div>
    </section>
  );
}
