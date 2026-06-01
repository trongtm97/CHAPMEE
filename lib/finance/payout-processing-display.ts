export const DEFAULT_PAYOUT_PROCESSING_DAYS_MIN = 1;
export const DEFAULT_PAYOUT_PROCESSING_DAYS_MAX = 5;

function parseDays(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

export function readPayoutProcessingDaysRange(
  settings: Record<string, unknown>
): { min: number; max: number } {
  const minSetting = settings["payout.processing_days_min"];
  const maxSetting = settings["payout.processing_days_max"];
  const legacySingle = settings["payout.processing_days"];

  if (minSetting == null && maxSetting == null && legacySingle != null) {
    const single = parseDays(legacySingle, DEFAULT_PAYOUT_PROCESSING_DAYS_MAX);
    return { min: single, max: single };
  }

  let min = parseDays(minSetting, DEFAULT_PAYOUT_PROCESSING_DAYS_MIN);
  let max = parseDays(maxSetting, DEFAULT_PAYOUT_PROCESSING_DAYS_MAX);

  if (min > max) {
    [min, max] = [max, min];
  }

  return { min, max };
}

export function formatPayoutProcessingDaysLabel(min: number, max: number): string {
  if (min <= 0 && max <= 0) {
    return "";
  }
  if (min === max) {
    return `${min} ngày`;
  }
  return `${min}–${max} ngày`;
}

export function readPayoutProcessingDaysLabel(settings: Record<string, unknown>): string {
  const { min, max } = readPayoutProcessingDaysRange(settings);
  return formatPayoutProcessingDaysLabel(min, max);
}
