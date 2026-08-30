const VI_NUMBER_FORMAT = new Intl.NumberFormat("vi-VN");

export function formatVnd(amount: number) {
  const safeAmount = Number.isFinite(amount) ? Math.trunc(amount) : 0;
  return `${VI_NUMBER_FORMAT.format(Math.max(0, safeAmount))}đ`;
}

export function formatXu(amount: number) {
  const safeAmount = Number.isFinite(amount) ? Math.trunc(amount) : 0;
  return `${VI_NUMBER_FORMAT.format(Math.max(0, safeAmount))} Xu`;
}

export function formatTopupPriceShort(amount: number) {
  const safeAmount = Math.max(0, Number.isFinite(amount) ? Math.trunc(amount) : 0);

  if (safeAmount >= 1_000_000 && safeAmount % 1_000_000 === 0) {
    return `${safeAmount / 1_000_000}M`;
  }

  if (safeAmount >= 1_000 && safeAmount % 1_000 === 0) {
    return `${safeAmount / 1_000}k`;
  }

  return formatVnd(safeAmount);
}

export function formatRecommendationPoints(amount: number) {
  const safeAmount = Number.isFinite(amount) ? Math.trunc(amount) : 0;
  return `${VI_NUMBER_FORMAT.format(Math.max(0, safeAmount))} điểm`;
}

export function formatCountdown(remainingSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(remainingSeconds) ? remainingSeconds : 0));

  if (safeSeconds <= 0) {
    return "0 giây";
  }

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0) parts.push(`${minutes} phút`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} giây`);

  return parts.join(" ");
}

export function formatCompactNumber(amount: number) {
  const safeAmount = Math.max(0, Number.isFinite(amount) ? amount : 0);

  if (safeAmount < 1000) {
    return VI_NUMBER_FORMAT.format(Math.floor(safeAmount));
  }

  if (safeAmount < 1_000_000) {
    const thousands = safeAmount / 1000;
    if (thousands >= 100) return `${Math.floor(thousands)}K`;
    return `${thousands.toFixed(1).replace(/\.0$/, "")}K`;
  }

  const millions = safeAmount / 1_000_000;
  if (millions >= 100) return `${Math.floor(millions)}M`;
  return `${millions.toFixed(1).replace(/\.0$/, "")}M`;
}
