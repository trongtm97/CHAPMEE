import type { MetadataRoute } from "next";

import { buildCanonicalUrl } from "@/lib/seo/metadata";

export function buildRobotsConfig(): MetadataRoute.Robots {
  const sitemapUrl = buildCanonicalUrl("/sitemap.xml");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/discover",
          "/reels",
          "/truyen/",
          "/@",
          "/the-loai/",
          "/tag/",
          "/bang-xep-hang",
          "/community",
          "/bai-viet/",
          "/thong-bao"
        ],
        disallow: [
          "/admin/",
          "/studio/",
          "/login",
          "/register",
          "/me/",
          "/settings/",
          "/messages/",
          "/notifications",
          "/wallet/",
          "/coin/",
          "/checkout/",
          "/payment/",
          "/draft/",
          "/preview/",
          "/onboarding/",
          "/api/",
          "/creators/",
          "/author/",
          "/tac-gia/",
          "/u/"
        ]
      }
    ],
    ...(sitemapUrl
      ? {
          sitemap: [sitemapUrl, buildCanonicalUrl("/pinterest-feed.xml")].filter(
            (value): value is string => Boolean(value)
          )
        }
      : { sitemap: ["/sitemap.xml", "/pinterest-feed.xml"] })
  };
}
