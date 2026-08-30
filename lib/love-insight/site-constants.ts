import { getPublicSiteOrigin } from "@/lib/site/site-url";

export const LOVE_INSIGHT_SITE_NAME =
  process.env.NEXT_PUBLIC_LOVE_INSIGHT_SITE_NAME ?? "ChapMee Bói Tình Yêu";

export function getLoveInsightSiteUrl(): string {
  return (
    getPublicSiteOrigin() ??
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ??
    "http://localhost:4000"
  );
}
