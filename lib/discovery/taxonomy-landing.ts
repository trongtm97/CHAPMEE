import { notFound, permanentRedirect } from "next/navigation";
import { getTaxonomyTermBySlug, getTaxonomyTermsByIds } from "@/lib/taxonomy/queries";
import {
  isTaxonomySeoIndexable,
  resolveTaxonomyCanonicalPath
} from "@/lib/seo/taxonomy-seo";
import { getPublishedStoryCountsByTermIds } from "@/lib/taxonomy/published-story-metrics";
import {
  resolveTaxonomyTypeFromUrlSegment,
  taxonomyLandingPath,
  taxonomyTermPublicUrl,
  taxonomyTypeFromLandingSegment
} from "@/lib/taxonomy/public-url";
import { getCatalogFilterOptions } from "@/lib/discovery/catalog-filter-options";
import { parseCatalogSearchParams } from "@/lib/discovery/catalog-url";
import { getTaxonomyLandingCatalogCached } from "@/lib/discovery/taxonomy-landing-catalog-cached";
import type { StoryCatalogFilterParams, TaxonomyLandingContext } from "@/lib/discovery/types";
import type { TaxonomyTerm, TaxonomyType } from "@/types/taxonomy";

const SEGMENT_TYPE: Record<string, TaxonomyType> = {
  "the-loai": "main_genre",
  "the-loai-phu": "subgenre",
  tag: "trope_tag",
  "boi-canh": "setting_tag",
  "cam-giac": "reader_experience",
  "dinh-dang": "presentation_mode",
  "nhan-vat": "character_tag",
  "quan-he": "relationship_tag",
  "phong-cach": "narrative_style",
  "canh-bao": "content_warning",
  "tinh-trang": "story_status",
  "goi-truy-cap": "monetization_access",
  "loai-truyen": "content_type",
  "do-tuoi": "age_rating"
};

export function resolveLandingType(segment: string): TaxonomyType | null {
  return (
    SEGMENT_TYPE[segment] ??
    taxonomyTypeFromLandingSegment(segment) ??
    resolveTaxonomyTypeFromUrlSegment(segment)
  );
}

function applyTermToCatalogFilters(
  type: TaxonomyType,
  slug: string,
  base: StoryCatalogFilterParams
): StoryCatalogFilterParams {
  const patch: StoryCatalogFilterParams = { ...base };
  switch (type) {
    case "main_genre":
      patch.genre = slug;
      break;
    case "subgenre":
      patch.subgenre = slug;
      break;
    case "trope_tag":
    case "editorial_tag":
      patch.tag = slug;
      break;
    case "setting_tag":
      patch.setting = slug;
      break;
    case "reader_experience":
      patch.experience = slug;
      break;
    case "presentation_mode":
      patch.presentation = slug;
      break;
    case "character_tag":
      patch.character = slug;
      break;
    case "relationship_tag":
      patch.relationship = slug;
      break;
    case "narrative_style":
      patch.narrativeStyle = slug;
      break;
    case "monetization_access":
      patch.monetization = slug;
      break;
    case "content_warning":
      patch.contentWarning = slug;
      break;
    case "story_status":
      if (slug === "ongoing") {
        patch.status = "ongoing";
      } else if (slug === "completed") {
        patch.status = "completed";
      } else {
        patch.storyStatus = slug;
      }
      break;
    case "content_type":
      patch.contentType = slug;
      break;
    case "age_rating":
      patch.ageRating = slug;
      break;
    default:
      break;
  }
  return patch;
}

async function loadParentMainGenre(term: TaxonomyTerm) {
  if (!term.parent_id) {
    return null;
  }
  const parents = await getTaxonomyTermsByIds([term.parent_id]);
  const parent = parents.data.find((row) => row.type === "main_genre") ?? null;
  if (!parent) {
    return null;
  }
  const href = taxonomyTermPublicUrl("main_genre", parent.slug, true);
  if (!href) {
    return null;
  }
  return { name: parent.name, slug: parent.slug, href };
}

/**
 * If a slug exists under a different public landing type (e.g. subgenre visited via /the-loai).
 */
export async function getLegacyTaxonomyLandingRedirect(
  segment: string,
  slug: string
): Promise<string | null> {
  const type = resolveLandingType(segment);
  if (!type) {
    return null;
  }

  const primary = await getTaxonomyTermBySlug(type, slug, { publicOnly: true });
  if (primary.data?.is_active && primary.data.is_public) {
    return null;
  }

  if (segment === "the-loai") {
    const subgenre = await getTaxonomyTermBySlug("subgenre", slug, { publicOnly: true });
    if (subgenre.data?.is_active && subgenre.data.is_public) {
      return taxonomyLandingPath("subgenre", slug);
    }
  }

  if (segment === "the-loai-phu") {
    const mainGenre = await getTaxonomyTermBySlug("main_genre", slug, { publicOnly: true });
    if (mainGenre.data?.is_active && mainGenre.data.is_public) {
      return taxonomyLandingPath("main_genre", slug);
    }
  }

  return null;
}

export async function assertTaxonomyLandingRoute(
  segment: string,
  slug: string,
  rawSearchParams: Record<string, string | undefined>
) {
  const redirectPath = await getLegacyTaxonomyLandingRedirect(segment, slug);
  if (redirectPath) {
    permanentRedirect(redirectPath);
  }

  const filters = parseCatalogSearchParams(rawSearchParams);
  const [data, filterOptions] = await Promise.all([
    getTaxonomyLandingPageData(segment, slug, filters),
    getCatalogFilterOptions()
  ]);
  return {
    landing: assertTaxonomyLandingVisible(data),
    filterOptions
  };
}

export async function getTaxonomyLandingByType(
  type: TaxonomyType,
  slug: string,
  catalogParams: StoryCatalogFilterParams = {}
) {
  return getTaxonomyLandingPageData(type, slug, catalogParams);
}

export async function getTaxonomyLandingPageData(
  segmentOrType: string | TaxonomyType,
  slug: string,
  catalogParams: StoryCatalogFilterParams = {}
) {
  const type =
    typeof segmentOrType === "string"
      ? resolveLandingType(segmentOrType)
      : segmentOrType;

  if (!type) {
    return null;
  }

  const termResult = await getTaxonomyTermBySlug(type, slug, { publicOnly: true });
  if (!termResult.data || !termResult.data.is_active || !termResult.data.is_public) {
    return null;
  }

  const term = termResult.data;
  const canonicalPath = resolveTaxonomyCanonicalPath(term) ?? taxonomyLandingPath(type, term.slug);
  if (!canonicalPath) {
    return null;
  }

  const catalog = await getTaxonomyLandingCatalogCached(
    type,
    term.slug,
    applyTermToCatalogFilters(type, term.slug, catalogParams)
  );
  const parentGenre =
    type === "subgenre" ? await loadParentMainGenre(term) : null;

  const countMap = await getPublishedStoryCountsByTermIds([term.id]);
  const publishedCount =
    countMap.get(term.id) ?? catalog.totalCount ?? catalog.stories.length;

  const context: TaxonomyLandingContext = {
    term,
    type,
    canonicalPath,
    indexable: isTaxonomySeoIndexable(term, publishedCount),
    publishedStoryCount: publishedCount,
    parentGenre
  };

  return { context, catalog };
}

export function assertTaxonomyLandingVisible(
  data: Awaited<ReturnType<typeof getTaxonomyLandingPageData>>
) {
  if (!data) {
    notFound();
  }
  return data;
}
