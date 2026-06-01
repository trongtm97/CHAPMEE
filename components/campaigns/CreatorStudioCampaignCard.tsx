"use client";

import { useEffect, useRef } from "react";
import { CampaignCtaLink } from "@/components/campaigns/CampaignCtaLink";
import { SponsoredBadge } from "@/components/campaigns/SponsoredBadge";
import { Card } from "@/components/ui";
import { resolveCampaignCta } from "@/lib/campaigns/cta";
import {
  trackSponsoredCampaignClicked,
  trackSponsoredCampaignViewed
} from "@/lib/campaigns/campaign-tracking";
import type { CampaignWithSponsor } from "@/types/campaign";

type CreatorStudioCampaignCardProps = {
  campaign: CampaignWithSponsor;
};

export function CreatorStudioCampaignCard({ campaign }: CreatorStudioCampaignCardProps) {
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
    <Card className="space-y-3 border-violet-500/20 bg-violet-950/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <SponsoredBadge text={campaign.disclosureText} />
        <span className="text-[10px] uppercase tracking-wide text-violet-300">Creator Studio</span>
      </div>
      <p className="text-base font-semibold text-white">{campaign.name}</p>
      <p className="text-sm text-zinc-400">
        {campaign.description?.trim() ||
          `Cơ hội từ ${campaign.sponsor?.name ?? "đối tác tài trợ"}.`}
      </p>
      {cta.href ? (
        <CampaignCtaLink
          campaign={campaign}
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-cyan-300 px-4 text-xs font-black uppercase tracking-[0.12em] text-zinc-950"
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
