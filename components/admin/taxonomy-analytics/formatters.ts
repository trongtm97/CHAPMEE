export function formatMetricNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function formatMetricPct(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

export function metricTone(delta: number | null | undefined) {
  if (delta === null || delta === undefined) return "text-blue-300";
  if (delta > 0) return "text-emerald-300";
  if (delta < 0) return "text-amber-300";
  return "text-blue-300";
}
