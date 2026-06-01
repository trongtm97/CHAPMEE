"use client";

import { useEffect, useRef } from "react";
import { CampaignCtaLink } from "@/components/campaigns/CampaignCtaLink";
import { SponsoredBadge } from "@/components/campaigns/SponsoredBadge";
import { Card } from "@/components/ui";
import {
  trackSponsoredCampaignClicked,
  trackSponsoredCampaignViewed
} from "@/lib/campaigns/campaign-tracking";
import type { CampaignWithSponsor } from "@/types/campaign";

type SponsoredChapterEndCtaProps = {
  campaign: CampaignWithSponsor;
};

export function SponsoredChapterEndCta({ campaign }: SponsoredChapterEndCtaProps) {
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    void trackSponsoredCampaignViewed({
      campaignId: campaign.id,
      sponsorId: campaign.sponsor?.id ?? null
    });
  }, [campaign.id, campaign.sponsor?.id]);

  return (
    <Card className="mt-8 space-y-3 border border-white/10 bg-white/[0.03] p-4 text-center">
      <SponsoredBadge text={campaign.disclosureText} />
      <p className="text-base font-semibold text-white">{campaign.name}</p>
      {campaign.description ? (
        <p className="text-sm text-zinc-400">{campaign.description}</p>
      ) : null}
      <CampaignCtaLink
        campaign={campaign}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-black uppercase tracking-[0.12em] text-zinc-950"
        onClick={() => {
          void trackSponsoredCampaignClicked({
            campaignId: campaign.id,
            sponsorId: campaign.sponsor?.id ?? null
          });
        }}
      />
    </Card>
  );
}
