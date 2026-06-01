import { getPopularTaxonomyTerms } from "@/lib/taxonomy/queries";
import type { TaxonomyIndexConfig, TaxonomyIndexKey } from "@/lib/discovery/taxonomy-index-config";
import { TAXONOMY_INDEX_CONFIG } from "@/lib/discovery/taxonomy-index-config";
import type { TaxonomyTerm } from "@/types/taxonomy";

export async function getTaxonomyIndexTerms(config: TaxonomyIndexConfig, limit = 80) {
  const result = await getPopularTaxonomyTerms(config.type, { discoverOnly: true, limit });
  if (result.error) {
    return { terms: [] as TaxonomyTerm[], error: result.error };
  }

  const terms = result.data.filter(
    (term) => (term.usage_count ?? 0) > 0 || term.is_featured
  );
  return { terms, error: null };
}

export function getTaxonomyIndexConfig(key: TaxonomyIndexKey) {
  return TAXONOMY_INDEX_CONFIG[key];
}
