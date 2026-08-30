import type { Metadata } from "next";

import { metadataForGovernedRoute } from "@/lib/seo/governed-route-metadata";
import { buildPageTitle, buildRobotsMeta } from "@/lib/seo/metadata";
import {
  DEFAULT_INDEX_ROUTE_PATTERNS,
  DEFAULT_NOINDEX_ROUTE_PATTERNS,
  getDefaultSeoRule,
  normalizePathname,
  patternMatchesRoute
} from "@/lib/seo/noindex";
import { getSeoRuleForRoute } from "@/lib/seo/rules";
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

/** @deprecated Prefer `metadataForGovernedRoute` — kept for existing imports. */
export async function buildSeoMetadata(input: BuildSeoMetadataInput): Promise<Metadata> {
  return metadataForGovernedRoute(input);
}

export function buildPrivateRouteMetadata(title: string): Metadata {
  return {
    title: buildPageTitle(title),
    robots: buildRobotsMeta({ indexable: false })
  };
}
