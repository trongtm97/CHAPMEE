"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { resolveCampaignCta } from "@/lib/campaigns/cta";
import type { BrandCampaignRecord } from "@/types/campaign";

type CampaignCtaLinkProps = {
  campaign: Pick<BrandCampaignRecord, "targetType" | "targetId" | "ctaUrl" | "ctaText">;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
};

export function CampaignCtaLink({
  campaign,
  className,
  children,
  onClick
}: CampaignCtaLinkProps) {
  const { href, external, label } = resolveCampaignCta(campaign);
  if (!href) return null;

  if (external) {
    return (
      <a
        className={className}
        href={href}
        onClick={onClick}
        rel="noopener noreferrer"
        target="_blank"
      >
        {children ?? label}
      </a>
    );
  }

  return (
    <Link className={className} href={href} onClick={onClick}>
      {children ?? label}
    </Link>
  );
}
