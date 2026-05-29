import { Card } from "@/components/ui";

import type { FinancePeriodMetric } from "@/types/finance";

type FinanceKpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  metric?: FinancePeriodMetric;
};

function formatDelta(metric: FinancePeriodMetric) {
  if (metric.changePercent == null) return null;
  const sign = metric.changePercent > 0 ? "+" : "";
  return `${sign}${metric.changePercent}% so với kỳ trước`;
}

export function FinanceKpiCard({ label, value, hint, metric }: FinanceKpiCardProps) {
  const delta = metric ? formatDelta(metric) : null;
  const deltaTone =
    metric?.changePercent == null
      ? "text-zinc-500"
      : metric.changePercent >= 0
        ? "text-emerald-400"
        : "text-rose-400";

  return (
    <Card className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-xl font-black text-white">{value}</p>
      {delta ? <p className={`text-xs ${deltaTone}`}>{delta}</p> : null}
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </Card>
  );
}
