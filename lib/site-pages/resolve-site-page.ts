import "server-only";

import { buildPlatformPageFallback, hasPlatformPageFallback } from "@/lib/site-pages/platform-page-fallback";
import { resolvePublishedSitePage } from "@/lib/site-pages/resolve-published-page";
import type { PolicyPage } from "@/types/policy-pages";

export type ResolvedSitePage = {
  source: "cms" | "fallback" | "none";
  page: PolicyPage | null;
};

export async function resolveSitePage(publicPath: string): Promise<ResolvedSitePage> {
  const cms = await resolvePublishedSitePage(publicPath);
  if (cms.published && cms.page) {
    return { source: "cms", page: cms.page };
  }

  if (hasPlatformPageFallback(publicPath)) {
    return { source: "fallback", page: buildPlatformPageFallback(publicPath) };
  }

  return { source: "none", page: null };
}
