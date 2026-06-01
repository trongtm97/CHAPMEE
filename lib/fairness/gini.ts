/** Gini coefficient for a distribution of impression counts (0 = equal, 1 = max inequality). */
export function calculateGini(values: number[]): number | null {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return null;
  const total = sorted.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return 0;

  let weighted = 0;
  for (let i = 0; i < n; i += 1) {
    weighted += (i + 1) * sorted[i];
  }
  return Math.max(0, Math.min(1, (2 * weighted) / (n * total) - (n + 1) / n));
}

export function topPercentShare(
  counts: Map<string, number>,
  total: number,
  percent: number
) {
  if (total <= 0 || counts.size === 0) return 0;
  const sorted = [...counts.values()].sort((a, b) => b - a);
  const take = Math.max(1, Math.ceil((sorted.length * percent) / 100));
  const topSum = sorted.slice(0, take).reduce((s, v) => s + v, 0);
  return (topSum / total) * 100;
}
