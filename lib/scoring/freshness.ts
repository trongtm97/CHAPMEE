import { clamp01 } from "@/lib/scoring/math";
import type { ScoringConfig } from "@/lib/scoring/config";
import type { ScoringItem } from "@/types/scoring";

const FRESHNESS_HOURS: Record<string, number> = {
  story: 72,
  chapter: 48,
  reel: 24
};

export function calculateFreshnessScore(
  item: ScoringItem,
  _config: ScoringConfig
) {
  const maxHours = FRESHNESS_HOURS[item.itemType] ?? 72;
  const publishedAt = item.publishedAt ? new Date(item.publishedAt).getTime() : null;

  if (!publishedAt || Number.isNaN(publishedAt)) {
    return { score: 0.35, debug: { reason: "no_publish_date", max_hours: maxHours } };
  }

  const ageHours = (Date.now() - publishedAt) / (1000 * 60 * 60);
  if (ageHours <= 0) {
    return { score: 1, debug: { age_hours: 0, max_hours: maxHours } };
  }

  if (ageHours >= maxHours * 3) {
    return { score: 0.1, debug: { age_hours: ageHours, max_hours: maxHours } };
  }

  const boostWindow = maxHours;
  const decay = Math.exp(-ageHours / boostWindow);
  const score = clamp01(0.15 + 0.85 * decay);

  return {
    score,
    debug: { age_hours: Math.round(ageHours * 10) / 10, max_hours: maxHours, decay }
  };
}
