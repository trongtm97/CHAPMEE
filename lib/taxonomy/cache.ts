import { unstable_cache } from "next/cache";
import { revalidateTag } from "next/cache";
import { getTaxonomyTerms, type GetTaxonomyTermsOptions } from "@/lib/taxonomy/queries";
import type { TaxonomyTerm, TaxonomyType } from "@/types/taxonomy";

const TAXONOMY_CACHE_SECONDS = 300;

function cacheTag(type: TaxonomyType, variant: string) {
  return `taxonomy:${type}:${variant}`;
}

function stripInternalNotes(terms: TaxonomyTerm[]): TaxonomyTerm[] {
  return terms.map((term) => {
    const { internal_note: _removed, ...rest } = term as TaxonomyTerm & {
      internal_note?: string | null;
    };
    return rest as TaxonomyTerm;
  });
}

async function loadCachedTerms(
  type: TaxonomyType,
  options: GetTaxonomyTermsOptions,
  variant: string
) {
  const loader = unstable_cache(
    async () => {
      const result = await getTaxonomyTerms(type, {
        ...options,
        usePublicClient: true
      });
      if (result.error) {
        return [] as TaxonomyTerm[];
      }
      return options.includeInternalNote
        ? result.data
        : stripInternalNotes(result.data);
    },
    [`taxonomy-cache-${type}-${variant}`],
    {
      revalidate: TAXONOMY_CACHE_SECONDS,
      tags: [cacheTag(type, variant), `taxonomy:${type}`]
    }
  );

  try {
    return await loader();
  } catch {
    const fallback = await getTaxonomyTerms(type, {
      ...options,
      usePublicClient: true
    });
    return fallback.data;
  }
}

export async function getCachedActiveTaxonomyTerms(type: TaxonomyType) {
  return loadCachedTerms(type, { activeOnly: true, publicOnly: true }, "active");
}

export async function getCachedSelectableTaxonomyTerms(type: TaxonomyType) {
  return loadCachedTerms(
    type,
    {
      activeOnly: true,
      publicOnly: true,
      selectableByCreatorOnly: true
    },
    "selectable"
  );
}

export async function getCachedFeaturedTaxonomyTerms(
  type: TaxonomyType,
  options?: { discoverOnly?: boolean; limit?: number }
) {
  return loadCachedTerms(
    type,
    {
      activeOnly: true,
      publicOnly: true,
      featuredOnly: true,
      discoverOnly: options?.discoverOnly ?? true,
      limit: options?.limit
    },
    `featured-${options?.discoverOnly ?? true}-${options?.limit ?? "all"}`
  );
}

export async function getCachedDiscoverTaxonomyTerms(
  type: TaxonomyType,
  options?: { limit?: number; orderBy?: "sort_order" | "usage_count" }
) {
  return loadCachedTerms(
    type,
    {
      activeOnly: true,
      publicOnly: true,
      discoverOnly: true,
      orderBy: options?.orderBy ?? "usage_count",
      limit: options?.limit
    },
    `discover-${options?.orderBy ?? "usage_count"}-${options?.limit ?? "all"}`
  );
}

export function invalidateTaxonomyCache(type?: TaxonomyType) {
  if (type) {
    revalidateTag(`taxonomy:${type}`, "max");
    return;
  }
  revalidateTag("taxonomy", "max");
}
