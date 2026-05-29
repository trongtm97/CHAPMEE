import type { CreatorRevenueSharePercents } from "@/types/admin-creator";

export function validateRevenueSharePercents(
  percents: CreatorRevenueSharePercents,
  enabled: boolean
): string | null {
  if (!enabled) return null;
  const fields: Array<[keyof CreatorRevenueSharePercents, string]> = [
    ["paidChapter", "Paid chapter"],
    ["tip", "Tip"],
    ["fanClub", "Fan club"],
    ["vipPool", "VIP pool"],
    ["bonusPool", "Bonus pool"]
  ];
  for (const [key, label] of fields) {
    const v = percents[key];
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      return `${label}: phần trăm phải từ 0 đến 100.`;
    }
  }
  return null;
}

export function percentsToCustomJsonb(percents: CreatorRevenueSharePercents) {
  return {
    paid_chapter: percents.paidChapter,
    tip: percents.tip,
    fan_club: percents.fanClub,
    vip_pool: percents.vipPool,
    bonus_pool: percents.bonusPool
  };
}

export function parsePercentsFromForm(formData: FormData): CreatorRevenueSharePercents {
  return {
    paidChapter: Number(formData.get("paid_chapter_percent") ?? 0),
    tip: Number(formData.get("tip_percent") ?? 0),
    fanClub: Number(formData.get("fan_club_percent") ?? 0),
    vipPool: Number(formData.get("vip_pool_percent") ?? 0),
    bonusPool: Number(formData.get("bonus_pool_percent") ?? 0)
  };
}
