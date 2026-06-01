import type {
  CampaignPlacement,
  CampaignStatus,
  CampaignType,
  FutureCampaignType
} from "@/types/campaign";

export type PlacementAvailability = "available" | "coming_soon" | "disabled";

export type PlacementDefinition = {
  id: CampaignPlacement;
  name: string;
  description: string;
  availability: PlacementAvailability;
  campaignTypes: CampaignType[];
};

export type CampaignTypeDefinition = {
  id: CampaignType;
  label: string;
  description: string;
  defaultPlacement: CampaignPlacement | null;
  enabled: boolean;
};

export type FutureCampaignTypeDefinition = {
  id: FutureCampaignType;
  label: string;
  description: string;
  enabled: false;
};

export const CAMPAIGN_TYPE_DEFINITIONS: CampaignTypeDefinition[] = [
  {
    id: "sponsored_challenge",
    label: "Challenge có tài trợ",
    description: "Tài trợ thử thách cộng đồng trong feed và trang challenge.",
    defaultPlacement: "community_sponsored_challenge",
    enabled: true
  },
  {
    id: "native_card",
    label: "Native card",
    description: "Card tài trợ dạng nội dung trong Discover/Reels.",
    defaultPlacement: "reels_native_card",
    enabled: true
  },
  {
    id: "banner",
    label: "Banner",
    description: "Banner nhẹ ở Discover hoặc Community.",
    defaultPlacement: "discover_banner",
    enabled: true
  },
  {
    id: "creator_opportunity",
    label: "Cơ hội tác giả",
    description: "Chiến dịch mời tác giả tham gia trong Creator Studio.",
    defaultPlacement: "creator_studio_opportunity",
    enabled: true
  },
  {
    id: "story_sponsorship",
    label: "Tài trợ truyện",
    description: "Tài trợ truyện/chapter với badge hoặc CTA cuối chương.",
    defaultPlacement: "story_sponsor_badge",
    enabled: true
  }
];

export const FUTURE_CAMPAIGN_TYPES: FutureCampaignTypeDefinition[] = [
  {
    id: "rewarded_ads",
    label: "Rewarded ads",
    description: "Quảng cáo có thưởng — chưa triển khai.",
    enabled: false
  },
  {
    id: "brand_mission",
    label: "Brand mission",
    description: "Nhiệm vụ thương hiệu — chưa triển khai.",
    enabled: false
  },
  {
    id: "affiliate_campaign",
    label: "Affiliate campaign",
    description: "Chiến dịch affiliate — chưa triển khai.",
    enabled: false
  }
];

export const PLACEMENT_DEFINITIONS: PlacementDefinition[] = [
  {
    id: "discover_banner",
    name: "Discover banner",
    description: "Banner nhẹ trên đầu feed Discover.",
    availability: "available",
    campaignTypes: ["banner"]
  },
  {
    id: "community_sponsored_challenge",
    name: "Community sponsored challenge",
    description: "Challenge có tài trợ trong feed cộng đồng và trang challenge.",
    availability: "available",
    campaignTypes: ["sponsored_challenge"]
  },
  {
    id: "reels_native_card",
    name: "Reels native card",
    description: "Card tài trợ xen kẽ trong luồng Reels.",
    availability: "available",
    campaignTypes: ["native_card"]
  },
  {
    id: "story_sponsor_badge",
    name: "Story detail sponsor badge",
    description: "Badge tài trợ trên trang chi tiết truyện.",
    availability: "available",
    campaignTypes: ["story_sponsorship"]
  },
  {
    id: "chapter_end_cta",
    name: "Chapter end CTA",
    description: "CTA tài trợ ở cuối chương truyện.",
    availability: "available",
    campaignTypes: ["story_sponsorship"]
  },
  {
    id: "creator_studio_opportunity",
    name: "Creator Studio campaign opportunity",
    description: "Cơ hội chiến dịch trong Creator Studio.",
    availability: "available",
    campaignTypes: ["creator_opportunity"]
  },
  {
    id: "search_ranking_promoted",
    name: "Search/Ranking promoted slot",
    description: "Vị trí quảng bá trong tìm kiếm và bảng xếp hạng.",
    availability: "coming_soon",
    campaignTypes: []
  }
];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Nháp",
  scheduled: "Đã lên lịch",
  active: "Đang chạy",
  paused: "Tạm dừng",
  ended: "Đã kết thúc",
  archived: "Đã lưu trữ"
};

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "border-zinc-600 text-zinc-400",
  scheduled: "border-blue-500/40 text-blue-200",
  active: "border-emerald-500/40 text-emerald-200",
  paused: "border-amber-500/40 text-amber-200",
  ended: "border-zinc-500/40 text-zinc-300",
  archived: "border-zinc-700 text-zinc-500"
};

export const SPONSOR_STATUS_LABELS: Record<string, string> = {
  active: "Hoạt động",
  inactive: "Không hoạt động",
  paused: "Tạm dừng",
  archived: "Đã lưu trữ"
};

export function getPlacementDefinition(placement: CampaignPlacement | null) {
  if (!placement) return null;
  return PLACEMENT_DEFINITIONS.find((item) => item.id === placement) ?? null;
}

export function getDefaultPlacementForType(type: CampaignType): CampaignPlacement | null {
  return CAMPAIGN_TYPE_DEFINITIONS.find((item) => item.id === type)?.defaultPlacement ?? null;
}

export function isPlacementAvailable(placement: CampaignPlacement | null): boolean {
  if (!placement) return false;
  const def = getPlacementDefinition(placement);
  return def?.availability === "available";
}

export function getCampaignTypeLabel(type: CampaignType): string {
  return CAMPAIGN_TYPE_DEFINITIONS.find((item) => item.id === type)?.label ?? type;
}

export function getPlacementLabel(placement: CampaignPlacement | null): string {
  if (!placement) return "—";
  return getPlacementDefinition(placement)?.name ?? placement;
}

export const CAMPAIGN_TABS = [
  { id: "campaigns", label: "Campaigns" },
  { id: "sponsors", label: "Sponsors" },
  { id: "placements", label: "Placements" },
  { id: "performance", label: "Performance" },
  { id: "settings", label: "Settings / Safety" }
] as const;

export type CampaignTabId = (typeof CAMPAIGN_TABS)[number]["id"];
