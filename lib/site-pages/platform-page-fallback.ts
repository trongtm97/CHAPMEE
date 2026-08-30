import { PLATFORM_PAGE_CONTENT, type PlatformPageContentMeta } from "@/lib/site-pages/platform-page-content";
import type { PolicyPage, PolicyType } from "@/types/policy-pages";

const FALLBACK_POLICY_TYPE_BY_PATH: Record<string, PolicyType> = {
  "/about": "account",
  "/contact": "community",
  "/legal": "content",
  "/legal/business-info": "account",
  "/legal/terms": "account",
  "/legal/privacy": "privacy",
  "/legal/cookies": "privacy",
  "/legal/payment-policy": "monetization",
  "/legal/refund-policy": "monetization",
  "/legal/service-delivery": "monetization",
  "/legal/complaints-disputes": "community",
  "/legal/content-policy": "content",
  "/legal/community-guidelines": "community",
  "/legal/copyright": "content",
  "/legal/dmca": "content",
  "/legal/advertising-policy": "advertising",
  "/legal/marketplace-regulation": "creator",
  "/legal/creator-terms": "creator",
  "/legal/creator-monetization-policy": "monetization",
  "/legal/creator-verification-policy": "creator"
};

export function getPlatformPageContentMeta(
  publicPath: string
): PlatformPageContentMeta | null {
  return PLATFORM_PAGE_CONTENT[publicPath] ?? null;
}

export function hasPlatformPageFallback(publicPath: string): boolean {
  return publicPath in PLATFORM_PAGE_CONTENT;
}

export function buildPlatformPageFallback(publicPath: string): PolicyPage | null {
  const meta = getPlatformPageContentMeta(publicPath);
  if (!meta) return null;

  const now = new Date().toISOString();

  return {
    id: `platform-fallback:${publicPath}`,
    public_code: null,
    slug: meta.slug,
    title: meta.title,
    summary: meta.summary,
    content: meta.content,
    policy_type: FALLBACK_POLICY_TYPE_BY_PATH[publicPath] ?? "content",
    status: "published",
    visibility: "public",
    version: 1,
    is_required: false,
    effective_date: null,
    seo_title: `${meta.title} | ChapMee`,
    seo_description: meta.summary,
    seo_indexable: true,
    canonical_path: publicPath,
    created_by: null,
    updated_by: null,
    published_by: null,
    published_at: now,
    created_at: now,
    updated_at: now
  };
}
