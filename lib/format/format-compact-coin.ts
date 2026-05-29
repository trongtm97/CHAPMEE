/**
 * Compact coin display for top bar: 0, 950, 12.5K, 1.2M
 */
export function formatCompactCoin(value: number): string {
  const amount = Math.max(0, value);

  if (amount < 1000) {
    return String(Math.floor(amount));
  }

  if (amount < 1_000_000) {
    const thousands = amount / 1000;
    if (thousands >= 100) {
      return `${Math.floor(thousands)}K`;
    }
    return `${thousands.toFixed(1).replace(/\.0$/, "")}K`;
  }

  const millions = amount / 1_000_000;
  if (millions >= 100) {
    return `${Math.floor(millions)}M`;
  }
  return `${millions.toFixed(1).replace(/\.0$/, "")}M`;
}
