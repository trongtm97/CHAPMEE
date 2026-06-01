"use client";

import { SponsoredBadge } from "@/components/campaigns/SponsoredBadge";
import { CampaignCtaLink } from "@/components/campaigns/CampaignCtaLink";
import { Card } from "@/components/ui";
import {
  trackSponsoredCampaignClicked,
  trackSponsoredCampaignViewed
} from "@/lib/campaigns/campaign-tracking";
import { resolveCampaignCta } from "@/lib/campaigns/cta";
import type { CampaignWithSponsor } from "@/types/campaign";
import { useEffect, useRef } from "react";

type SponsoredStoryBadgeProps = {
  campaign: CampaignWithSponsor;
};

export function SponsoredStoryBadge({ campaign }: SponsoredStoryBadgeProps) {
  const viewedRef = useRef(false);
  const cta = resolveCampaignCta(campaign);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    void trackSponsoredCampaignViewed({
      campaignId: campaign.id,
      sponsorId: campaign.sponsor?.id ?? null
    });
  }, [campaign.id, campaign.sponsor?.id]);

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-amber-300/20 bg-amber-500/5 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <SponsoredBadge text={campaign.disclosureText} />
        <span className="text-sm text-zinc-300">
          {campaign.sponsor?.name ?? "Nhà tài trợ"}
          {campaign.name ? ` · ${campaign.name}` : ""}
        </span>
      </div>
      {cta.href ? (
        <CampaignCtaLink
          campaign={campaign}
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          onClick={() => {
            void trackSponsoredCampaignClicked({
              campaignId: campaign.id,
              sponsorId: campaign.sponsor?.id ?? null
            });
          }}
        />
      ) : null}
    </Card>
  );
}
