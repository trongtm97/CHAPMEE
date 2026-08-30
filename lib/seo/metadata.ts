import type { Metadata } from "next";

import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";
import { BRAND_NAME } from "@/lib/brand/constants";
import { createExcerpt } from "@/lib/text/createExcerpt";

export const SITE_NAME = BRAND_NAME;

/** Title mặc định root layout / Reels. */
export const DEFAULT_SITE_TITLE = `${BRAND_NAME} - Nền tảng giải trí truyện thế hệ mới`;

/** Meta description mặc định (OG, Twitter, fallback trang). */
export const DEFAULT_SITE_DESCRIPTION = `${BRAND_NAME} là nền tảng đọc, viết và khám phá truyện theo phong cách hiện đại, kết hợp Reels, cộng đồng và công cụ Studio cho tác giả.`;

/** Mô tả ngắn cho PWA manifest. */
export const PWA_MANIFEST_DESCRIPTION = `Đọc, viết và khám phá truyện trên ${BRAND_NAME}.`;

const DEFAULT_DESCRIPTION = DEFAULT_SITE_DESCRIPTION;
const DEFAULT_OG_IMAGE = "/og-default.svg";

function readSiteUrl() {
  // NEXT_PUBLIC_* is inlined at build time in standalone images; APP_URL / SITE_URL
  // are runtime env vars on Docker VPS and must be used as fallbacks for sitemap, canonical, robots.
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL
  ];

  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) {
      continue;
    }
    try {
      return new URL(value);
    } catch {
      continue;
    }
  }

  return null;
}

export function getMetadataBase() {
  return readSiteUrl();
}

export function toAbsoluteUrl(pathname: string) {
  const base = readSiteUrl();

  if (!base) {
    return null;
  }

  try {
    return new URL(pathname, base).toString();
  } catch {
    return null;
  }
}

export function resolvePublicUrl(value: string | null | undefined) {
  const cleaned = cleanText(value);

  if (!cleaned) {
    return null;
  }

  try {
    return new URL(cleaned).toString();
  } catch {
    return toAbsoluteUrl(cleaned);
  }
}

export function cleanText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function trimDescription(value: string, maxLength = 160) {
  const text = cleanText(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export function joinDescription(...parts: Array<string | null | undefined>) {
  const text = cleanText(parts.filter(Boolean).join(" "));

  return text || DEFAULT_DESCRIPTION;
}

export function buildStoryDescription(story: StoryDetail) {
  return trimDescription(
    joinDescription(
      story.hook,
      story.shortDescription,
      story.creatorName ? `Tác giả: ${story.creatorName}.` : null
    )
  );
}

export function buildEpisodeDescription(data: EpisodeReaderData) {
  const excerpt = cleanText(createExcerpt(data.episode.content, 20, 40));

  return trimDescription(
    joinDescription(
      `${data.story.title} - ${data.episode.title}.`,
      excerpt,
      data.story.creatorName ? `Tác giả: ${data.story.creatorName}.` : null
    )
  );
}

export function buildAuthorDescription(input: { displayName: string; bio?: string | null }) {
  return trimDescription(joinDescription(input.bio, `Khám phá ${input.displayName} trên ChapMee.`));
}

export function buildDefaultMetadata(): Metadata {
  const metadataBase = getMetadataBase();
  const defaultImage = {
    url: DEFAULT_OG_IMAGE,
    width: 1200,
    height: 630,
    alt: SITE_NAME
  };

  return {
    metadataBase: metadataBase ?? undefined,
    title: {
      default: DEFAULT_SITE_TITLE,
      template: `%s | ${SITE_NAME}`
    },
    description: DEFAULT_DESCRIPTION,
    applicationName: SITE_NAME,
    openGraph: {
      title: DEFAULT_SITE_TITLE,
      description: DEFAULT_DESCRIPTION,
      siteName: SITE_NAME,
      type: "website",
      url: "/",
      images: [defaultImage]
    },
    twitter: {
      card: "summary_large_image",
      title: DEFAULT_SITE_TITLE,
      description: DEFAULT_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE]
    }
  };
}

export function buildCanonicalUrl(pathname: string) {
  return toAbsoluteUrl(pathname) ?? undefined;
}

export function buildPageTitle(baseTitle: string, suffix = SITE_NAME) {
  const title = cleanText(baseTitle);
  if (!title) {
    return suffix;
  }

  if (title.toLowerCase().includes(suffix.toLowerCase())) {
    return title;
  }

  return `${title} | ${suffix}`;
}

export function buildMetaDescription(
  input: string | null | undefined,
  fallback?: string | null
) {
  return trimDescription(cleanText(input) || cleanText(fallback) || DEFAULT_DESCRIPTION);
}

export { buildRobotsMeta } from "@/lib/seo/noindex";

export function getDefaultOgImage() {
  return DEFAULT_OG_IMAGE;
}
