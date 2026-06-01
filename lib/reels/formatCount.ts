export function formatReelsCount(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const normalized = Math.max(0, value);

  if (normalized < 1000) {
    return `${normalized}`;
  }

  if (normalized < 1_000_000) {
    const compact = normalized / 1000;
    return `${compact >= 100 ? Math.round(compact) : Number(compact.toFixed(1)).toString()}K`;
  }

  if (normalized < 1_000_000_000) {
    const compact = normalized / 1_000_000;
    return `${compact >= 100 ? Math.round(compact) : Number(compact.toFixed(1)).toString()}M`;
  }

  const compact = normalized / 1_000_000_000;
  return `${compact >= 100 ? Math.round(compact) : Number(compact.toFixed(1)).toString()}B`;
}
