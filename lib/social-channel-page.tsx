import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SocialChannelPlaceholder } from "@/components/social/SocialChannelPlaceholder";
import { buildSeoMetadata } from "@/lib/platform-content";
import {
  getSocialExternalUrl,
  getSocialPlaceholderCopy,
  type ChapmeeSocialPlatform
} from "@/lib/chapmee-social-links";
import { buildCanonicalUrl, SITE_NAME } from "@/lib/seo/metadata";

export async function buildSocialChannelMetadata(
  platform: ChapmeeSocialPlatform
): Promise<Metadata> {
  const { title, description } = getSocialPlaceholderCopy(platform);
  return buildSeoMetadata({
    pathname: `/${platform}`,
    pageType: "page",
    title: `${title} | ${SITE_NAME}`,
    description,
    canonicalUrl: buildCanonicalUrl(`/${platform}`) || undefined,
    indexableOverride: false
  });
}

export function SocialChannelPage({ platform }: { platform: ChapmeeSocialPlatform }) {
  const externalUrl = getSocialExternalUrl(platform);
  if (externalUrl) {
    redirect(externalUrl);
  }

  return <SocialChannelPlaceholder platform={platform} />;
}
