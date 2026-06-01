export function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number) {
  return clamp(value, 0, 1);
}

export function safeRate(numerator: number, denominator: number, fallback = 0) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return fallback;
  }
  return numerator / denominator;
}

export function weightedMean(
  pairs: { value: number; weight: number }[],
  fallback = 0
) {
  let sum = 0;
  let weight = 0;
  for (const pair of pairs) {
    if (!Number.isFinite(pair.value) || !Number.isFinite(pair.weight)) continue;
    sum += pair.value * pair.weight;
    weight += pair.weight;
  }
  if (weight <= 0) return fallback;
  return sum / weight;
}

export function parseMetricsWindowDays(window: string) {
  if (window === "30d") return 30;
  return 7;
}

export function windowStartDate(window: string) {
  const days = parseMetricsWindowDays(window);
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days);
  return start.toISOString();
}
