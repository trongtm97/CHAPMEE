"use client";

import { useEffect, useRef } from "react";
import { CampaignCtaLink } from "@/components/campaigns/CampaignCtaLink";
import { SponsoredBadge } from "@/components/campaigns/SponsoredBadge";
import { Card } from "@/components/ui";
import {
  trackSponsoredCampaignClicked,
  trackSponsoredCampaignViewed
} from "@/lib/campaigns/campaign-tracking";
import type { BrandCampaignRecord } from "@/types/campaign";

type SponsoredChallengeBannerProps = {
  campaignId: string;
  sponsorId: string | null;
  challengeId?: string | null;
  sponsorName: string;
  sponsorLogoUrl?: string | null;
  disclosureText: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  targetType?: BrandCampaignRecord["targetType"];
  targetId?: BrandCampaignRecord["targetId"];
  description?: string | null;
};

export function SponsoredChallengeBanner(props: SponsoredChallengeBannerProps) {
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    void trackSponsoredCampaignViewed({
      campaignId: props.campaignId,
      sponsorId: props.sponsorId,
      challengeId: props.challengeId ?? null
    });
  }, [props.campaignId, props.challengeId, props.sponsorId]);

  const campaignCta = {
    ctaText: props.ctaText ?? null,
    ctaUrl: props.ctaUrl ?? null,
    targetType: props.targetType ?? (props.ctaUrl ? ("external_url" as const) : ("none" as const)),
    targetId: props.targetId ?? null
  };

  return (
    <Card className="space-y-3 border-amber-300/25 bg-amber-500/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <SponsoredBadge text={props.disclosureText} />
        <p className="text-xs text-zinc-300">{props.sponsorName}</p>
      </div>
      <div className="flex items-center gap-3">
        {props.sponsorLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={props.sponsorName}
            className="h-8 w-8 rounded-md object-cover"
            src={props.sponsorLogoUrl}
          />
        ) : null}
        <p className="text-sm text-zinc-200">
          {props.description?.trim() || (
            <>
              Nội dung được tài trợ bởi{" "}
              <span className="font-semibold">{props.sponsorName}</span>.
            </>
          )}
        </p>
      </div>
      <CampaignCtaLink
        campaign={campaignCta}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-amber-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-zinc-950"
        onClick={() => {
          void trackSponsoredCampaignClicked({
            campaignId: props.campaignId,
            sponsorId: props.sponsorId,
            challengeId: props.challengeId ?? null
          });
        }}
      />
    </Card>
  );
}
