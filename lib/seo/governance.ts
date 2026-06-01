export {
  normalizeVietnameseSlug,
  validateSeoSlug,
  isValidSeoSlug,
  SEO_SLUG_REGEX
} from "@/lib/seo/slug";

export {
  STUDIO_NOINDEX_ROBOTS,
  DEFAULT_NOINDEX_ROUTE_PATTERNS,
  DEFAULT_INDEX_ROUTE_PATTERNS,
  normalizePathname,
  patternMatchesRoute,
  getDefaultSeoRule,
  shouldNoIndexPath,
  shouldNoIndexRoute,
  hasPreviewQuery,
  buildRobotsMeta,
  buildPrivateRouteMetadata
} from "@/lib/seo/noindex";

export {
  getSeoRuleForRoute,
  listSeoRulesFromDb,
  getSeoRuleById,
  updateSeoRuleInDb,
  computeSeoRuleStats,
  resolveRouteIndexable
} from "@/lib/seo/rules";

export {
  buildPageTitle,
  buildMetaDescription,
  buildCanonicalUrl,
  cleanText,
  trimDescription,
  joinDescription,
  SITE_NAME,
  DEFAULT_SITE_TITLE,
  DEFAULT_SITE_DESCRIPTION
} from "@/lib/seo/metadata";

export { buildPublicSitemapEntries } from "@/lib/seo/sitemap";
export { buildRobotsConfig } from "@/lib/seo/robots-config";
export { runSeoAuditMvp, persistSeoAuditFindings } from "@/lib/seo/audit";
export type { SeoAuditFinding, SeoAuditReport } from "@/lib/seo/audit";

export {
  buildSeoMetadata,
  buildPrivateRouteMetadata as buildPrivateRouteMetadataForRoute
} from "@/lib/platform-content/seo-governance";
