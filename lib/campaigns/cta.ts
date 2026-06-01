import { getCampaignCtaHref, isExternalCampaignLink } from "@/lib/campaigns/visibility";
import type { BrandCampaignRecord } from "@/types/campaign";

export function resolveCampaignCta(campaign: Pick<
  BrandCampaignRecord,
  "targetType" | "targetId" | "ctaUrl" | "ctaText"
>) {
  const href = getCampaignCtaHref(campaign);
  const external = isExternalCampaignLink(campaign);
  const label = campaign.ctaText?.trim() || (external ? "Tìm hiểu thêm" : "Xem thêm");

  return { href, external, label };
}
