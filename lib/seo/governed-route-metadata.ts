import type { Metadata } from "next";
import { metadataFromSeoEngine } from "@/lib/seo/public-page-metadata";
import { mapGovernedPageType } from "@/lib/seo/map-governed-page-type";
import { buildCanonicalUrl, cleanText } from "@/lib/seo/metadata";
import { normalizePathname } from "@/lib/seo/noindex";
import { getSeoRuleForRoute, resolveRouteIndexable } from "@/lib/seo/rules";
import { isSearchEngineIndexingBlocked } from "@/lib/settings/get-site-launch-settings";
import type { BuildSeoMetadataInput } from "@/types/platform-content";

function resolveGovernedCanonicalPath(input: {
  pathname: string;
  canonicalUrl?: string | null;
  rule: Awaited<ReturnType<typeof getSeoRuleForRoute>>;
}): string | undefined {
  if (input.rule?.canonical_mode === "none") {
    return undefined;
  }
  if (input.rule?.canonical_mode === "custom" && input.rule.custom_canonical_url?.trim()) {
    return input.rule.custom_canonical_url.trim();
  }
  if (input.canonicalUrl?.trim()) {
    return input.canonicalUrl.trim();
  }
  return buildCanonicalUrl(input.pathname) || input.pathname;
}

/**
 * Unified metadata for platform-governed routes (about, legal, policy, announcements…).
 * Uses SEO Center resolver so admin overrides apply.
 */
export async function metadataForGovernedRoute(input: BuildSeoMetadataInput): Promise<Metadata> {
  const pathname = normalizePathname(input.pathname);
  const [rule, blockSearchEngines] = await Promise.all([
    getSeoRuleForRoute(pathname),
    isSearchEngineIndexingBlocked()
  ]);

  const routeIndex = blockSearchEngines
    ? { indexable: false, follow: false }
    : resolveRouteIndexable({
        pathname,
        indexableOverride: input.indexableOverride,
        rule
      });

  const indexableOverride =
    input.indexableOverride !== undefined
      ? input.indexableOverride
      : routeIndex.indexable
        ? null
        : false;

  const canonicalPath = resolveGovernedCanonicalPath({
    pathname,
    canonicalUrl: input.canonicalUrl,
    rule
  });

  return metadataFromSeoEngine({
    path: pathname,
    pageType: mapGovernedPageType(input.pageType),
    targetType: "route",
    fallbackTitle: cleanText(input.title) || "",
    fallbackDescription: cleanText(input.description) || "",
    indexableOverride,
    followOverride: input.followOverride ?? routeIndex.follow,
    entityData: {
      pageTitle: input.title ?? undefined,
      shortDescription: input.description ?? undefined,
      canonicalPath: canonicalPath ?? pathname,
      coverUrl: input.ogImage ?? undefined
    },
    openGraphType: "website"
  });
}
