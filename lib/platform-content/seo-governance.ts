import type { Metadata } from "next";

import {
  buildCanonicalUrl,
  buildMetaDescription,
  buildPageTitle,
  buildRobotsMeta,
  cleanText,
  joinDescription,
  resolvePublicUrl,
  SITE_NAME
} from "@/lib/seo/metadata";
import {
  DEFAULT_INDEX_ROUTE_PATTERNS,
  DEFAULT_NOINDEX_ROUTE_PATTERNS,
  getDefaultSeoRule,
  normalizePathname,
  patternMatchesRoute
} from "@/lib/seo/noindex";
import { getSeoRuleForRoute, resolveRouteIndexable } from "@/lib/seo/rules";
import type { BuildSeoMetadataInput } from "@/types/platform-content";

export {
  DEFAULT_NOINDEX_ROUTE_PATTERNS,
  DEFAULT_INDEX_ROUTE_PATTERNS,
  getDefaultSeoRule,
  normalizePathname,
  patternMatchesRoute,
  shouldNoIndexPath,
  shouldNoIndexRoute
} from "@/lib/seo/noindex";

export { getSeoRuleForRoute } from "@/lib/seo/rules";

function applyTemplate(template: string | null | undefined, vars: Record<string, string>) {
  if (!template) {
    return null;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

export async function buildSeoMetadata(input: BuildSeoMetadataInput): Promise<Metadata> {
  const pathname = normalizePathname(input.pathname);
  const rule = await getSeoRuleForRoute(pathname);

  const { indexable, follow } = resolveRouteIndexable({
    pathname,
    indexableOverride: input.indexableOverride,
    rule
  });

  const vars = {
    title: input.title ?? SITE_NAME,
    site_name: SITE_NAME,
    page_type: input.pageType ?? rule?.page_type ?? "page"
  };

  const title =
    cleanText(input.title) ||
    cleanText(applyTemplate(rule?.title_template, vars)) ||
    SITE_NAME;

  const description = buildMetaDescription(
    cleanText(input.description) || cleanText(applyTemplate(rule?.description_template, vars)),
    joinDescription()
  );

  let canonical: string | undefined;
  if (rule?.canonical_mode === "none") {
    canonical = undefined;
  } else if (rule?.canonical_mode === "custom" && rule.custom_canonical_url) {
    canonical = rule.custom_canonical_url;
  } else if (input.canonicalUrl) {
    canonical = input.canonicalUrl;
  } else {
    canonical = buildCanonicalUrl(pathname);
  }

  const robots = buildRobotsMeta({ indexable, followLinks: follow });
  const ogImage = input.ogImage ? resolvePublicUrl(input.ogImage) : null;

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    robots,
    openGraph: {
      title,
      description,
      ...(canonical ? { url: canonical } : {}),
      type: "website",
      siteName: SITE_NAME,
      ...(ogImage ? { images: [{ url: ogImage }] } : {})
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {})
    }
  };
}

export function buildPrivateRouteMetadata(title: string): Metadata {
  return {
    title: buildPageTitle(title),
    robots: buildRobotsMeta({ indexable: false })
  };
}
