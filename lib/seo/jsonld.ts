/**
 * JSON-LD helpers for SEO metadata engine.
 * Re-exports existing structured-data builders — no fake ratings or legal claims.
 */

export {
  buildBreadcrumbJsonLd as createBreadcrumbJsonLd,
  buildWebSiteJsonLd as createWebsiteJsonLd,
  buildStoryBookJsonLd as createStoryJsonLd,
  buildEpisodeArticleJsonLd as createArticleJsonLd,
  buildPersonJsonLd as createPersonJsonLd,
  buildOrganizationJsonLd as createOrganizationJsonLd
} from "@/lib/seo/structured-data";

export type JsonLdBreadcrumbItem = {
  name: string;
  url: string;
};

export type JsonLdStoryInput = import("@/lib/stories/getStoryBySlug").StoryDetail;

export type JsonLdArticleInput = import("@/lib/episodes/getEpisodeReaderData").EpisodeReaderData;

export type JsonLdPersonInput = {
  name: string;
  url: string;
  description?: string | null;
  image?: string | null;
};

/** Merge optional extra JSON-LD from seo_overrides without overwriting core @context. */
export function mergeExtraJsonLd(
  base: Record<string, unknown> | null | undefined,
  extra: Record<string, unknown> | unknown[] | null | undefined
): Record<string, unknown> | unknown[] | null {
  if (!extra) {
    return base ?? null;
  }

  if (Array.isArray(extra)) {
    if (base) {
      return [base, ...extra];
    }
    return extra;
  }

  if (base && typeof extra === "object") {
    return { ...base, ...extra };
  }

  return extra as Record<string, unknown>;
}
