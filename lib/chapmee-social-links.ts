import { SITE_LINKS } from "@/lib/config/site-links";

export type ChapmeeSocialPlatform = "facebook" | "tiktok" | "youtube";

export type ChapmeeSocialLink = {
  platform: ChapmeeSocialPlatform;
  label: string;
  href: string;
  ariaLabel: string;
};

const SOCIAL_ORDER: ChapmeeSocialPlatform[] = ["facebook", "tiktok", "youtube"];

/** Official ChapMee social short links (footer only — not user profiles). */
export const CHAPMEE_SOCIAL_LINKS: ChapmeeSocialLink[] = SOCIAL_ORDER.map(
  (platform) => {
    const item = SITE_LINKS.find((link) => link.id === platform);
    const label = item?.title ?? platform;
    return {
      platform,
      label,
      href: item?.href ?? `/${platform}`,
      ariaLabel: `${label} ChapMee`
    };
  }
);

const EXTERNAL_URL_ENV: Record<ChapmeeSocialPlatform, string[]> = {
  facebook: ["CHAPMEE_FACEBOOK_URL", "FACEBOOK_URL"],
  tiktok: ["CHAPMEE_TIKTOK_URL", "TIKTOK_URL"],
  youtube: ["CHAPMEE_YOUTUBE_URL", "YOUTUBE_URL"]
};

export function getChapmeeSocialLink(platform: ChapmeeSocialPlatform): ChapmeeSocialLink {
  const link = CHAPMEE_SOCIAL_LINKS.find((item) => item.platform === platform);
  if (!link) {
    throw new Error(`Unknown social platform: ${platform}`);
  }
  return link;
}

/** External profile URL when configured; otherwise null (use placeholder page). */
export function getSocialExternalUrl(platform: ChapmeeSocialPlatform): string | null {
  for (const key of EXTERNAL_URL_ENV[platform]) {
    const raw = process.env[key]?.trim();
    if (!raw) continue;
    try {
      const url = new URL(raw);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return raw;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function getSocialPlaceholderCopy(platform: ChapmeeSocialPlatform) {
  const link = getChapmeeSocialLink(platform);
  return {
    title: `Kênh ${link.label} ChapMee`,
    description: `Liên kết ${link.label} chính thức của ChapMee đang được cập nhật.`
  };
}
