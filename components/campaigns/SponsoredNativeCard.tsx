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

type SponsoredNativeCardProps = {
  campaign: CampaignWithSponsor;
};

export function SponsoredNativeCard({ campaign }: SponsoredNativeCardProps) {
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
    <div className="flex h-full min-h-full items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-black p-5">
      <Card className="w-full max-w-md space-y-4 border-cyan-500/20 bg-zinc-950/90 p-5">
        <div className="flex items-center justify-between gap-3">
          <SponsoredBadge text={campaign.disclosureText} />
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">Reels</span>
        </div>

        {campaign.sponsor?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={campaign.sponsor.name}
            className="h-12 w-12 rounded-xl object-cover"
            src={campaign.sponsor.logoUrl}
          />
        ) : null}

        <div>
          <p className="text-lg font-bold text-white">{campaign.name}</p>
          <p className="mt-1 text-sm text-zinc-400">
            {campaign.description?.trim() ||
              `Nội dung tài trợ bởi ${campaign.sponsor?.name ?? "đối tác"}.`}
          </p>
        </div>

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
    </div>
  );
}
