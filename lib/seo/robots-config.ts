import type { MetadataRoute } from "next";

import { buildCanonicalUrl } from "@/lib/seo/metadata";

/** Paths disallowed in robots.txt (private / non-indexable). */
export const ROBOTS_DISALLOW_PATHS = [
  "/admin/",
  "/studio/",
  "/login",
  "/register",
  "/me/",
  "/settings/",
  "/messages/",
  "/notifications/",
  "/wallet/",
  "/coin/",
  "/checkout/",
  "/payment/",
  "/draft/",
  "/preview/",
  "/onboarding/",
  "/api/",
  "/creator/",
  "/creators/",
  "/author/",
  "/tac-gia/",
  "/u/",
  "/profile/"
] as const;

export const ROBOTS_ALLOW_PATHS = [
  "/",
  "/discover",
  "/media",
  "/reels",
  "/truyen/",
  "/truyen-sang-tac",
  "/truyen-dich",
  "/@",
  "/the-loai/",
  "/tag/",
  "/bang-xep-hang",
  "/community",
  "/about",
  "/contact",
  "/community-guidelines",
  "/bai-viet/",
  "/thong-bao",
  "/chinh-sach/"
] as const;

export function buildRobotsConfig(): MetadataRoute.Robots {
  const sitemapUrl = buildCanonicalUrl("/sitemap.xml");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [...ROBOTS_ALLOW_PATHS],
        disallow: [...ROBOTS_DISALLOW_PATHS]
      }
    ],
    ...(sitemapUrl
      ? {
          sitemap: [
            sitemapUrl,
            buildCanonicalUrl("/pinterest-feed.xml"),
            buildCanonicalUrl("/pinterest-feed-truyen.xml"),
            buildCanonicalUrl("/pinterest-feed-bai-viet.xml")
          ].filter((value): value is string => Boolean(value))
        }
      : {})
  };
}
