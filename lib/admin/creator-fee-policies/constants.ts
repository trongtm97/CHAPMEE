export const CREATOR_FEE_REVENUE_SOURCES = [
  {
    id: "paid_chapter" as const,
    label: "Chương trả phí",
    moduleKey: "paid_chapter",
    creatorConfigKey: "revenue_share.paid_chapter_creator_percent",
    platformConfigKey: "revenue_share.paid_chapter_platform_percent",
    useDefaultConfigKey: "revenue_share.paid_chapter_use_default"
  },
  {
    id: "tip" as const,
    label: "Tip",
    moduleKey: "tip",
    creatorConfigKey: "revenue_share.tip_creator_percent",
    platformConfigKey: "revenue_share.tip_platform_percent",
    useDefaultConfigKey: "revenue_share.tip_use_default"
  },
  {
    id: "early_access" as const,
    label: "Truy cập sớm",
    moduleKey: "early_access",
    creatorConfigKey: "revenue_share.early_access_creator_percent",
    platformConfigKey: "revenue_share.early_access_platform_percent",
    useDefaultConfigKey: "revenue_share.early_access_use_default"
  },
  {
    id: "vip_subscription" as const,
    label: "VIP subscription",
    moduleKey: "vip_pool",
    creatorConfigKey: "revenue_share.vip_creator_pool_percent",
    platformConfigKey: "revenue_share.platform_fee_percent",
    useDefaultConfigKey: "revenue_share.vip_use_default"
  },
  {
    id: "fan_club_subscription" as const,
    label: "Fan club",
    moduleKey: "fan_club",
    creatorConfigKey: "revenue_share.fan_club_creator_percent",
    platformConfigKey: "revenue_share.fan_club_platform_percent",
    useDefaultConfigKey: "revenue_share.fan_club_use_default"
  },
  {
    id: "virtual_gift" as const,
    label: "Quà ảo",
    moduleKey: "gift",
    creatorConfigKey: "revenue_share.gift_creator_percent",
    platformConfigKey: "revenue_share.gift_platform_percent",
    useDefaultConfigKey: "revenue_share.gift_use_default"
  },
  {
    id: "rewarded_ads" as const,
    label: "Rewarded ads",
    moduleKey: "rewarded_ads",
    creatorConfigKey: "revenue_share.default_creator_percent",
    platformConfigKey: "revenue_share.default_platform_percent"
  },
  {
    id: "sponsored_challenge" as const,
    label: "Sponsored challenge",
    moduleKey: "sponsored_challenge",
    creatorConfigKey: "revenue_share.default_creator_percent",
    platformConfigKey: "revenue_share.default_platform_percent"
  }
] as const;

export const CREATOR_FEE_STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  active: "Đang hoạt động",
  scheduled: "Đã lên lịch",
  expired: "Hết hạn",
  disabled: "Đã tắt",
  paused: "Tạm dừng",
  revoked: "Thu hồi"
};

export const CREATOR_FEE_CREATOR_TYPE_LABELS: Record<string, string> = {
  normal: "Thường",
  verified: "Verified",
  blue_tick: "Tick xanh",
  originals: "Originals",
  strategic_partner: "Đối tác chiến lược"
};

export function moduleToRevenueSource(moduleType: string): string {
  const map: Record<string, string> = {
    paid_chapter: "paid_chapter",
    tip: "tip",
    early_access: "early_access",
    vip_pool: "vip_subscription",
    fan_club: "fan_club_subscription",
    gift: "virtual_gift",
    rewarded_ads: "rewarded_ads",
    sponsored_challenge: "sponsored_challenge"
  };
  return map[moduleType] ?? "paid_chapter";
}

export function revenueSourceToModule(sourceId: string): string {
  const found = CREATOR_FEE_REVENUE_SOURCES.find((s) => s.id === sourceId);
  return found?.moduleKey ?? "paid_chapter";
}
