import { createClient } from "@/lib/supabase/server";
import { CREATOR_ASSIGNABLE_TAXONOMY_TYPES } from "@/lib/taxonomy/constants";
import { mapTaxonomyTermRow } from "@/lib/taxonomy/map-row";
import type { TaxonomyTerm, TaxonomyType } from "@/types/taxonomy";

export type TaxonomyCatalog = {
  byTypeAndSlug: Map<string, TaxonomyTerm>;
  byType: Partial<Record<TaxonomyType, TaxonomyTerm[]>>;
};

function catalogKey(type: TaxonomyType, slug: string) {
  return `${type}:${slug.trim().toLowerCase()}`;
}

export async function loadCreatorTaxonomyCatalog(): Promise<{
  catalog: TaxonomyCatalog;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("taxonomy_terms")
    .select("*")
    .in("type", [...CREATOR_ASSIGNABLE_TAXONOMY_TYPES])
    .eq("is_active", true)
    .eq("is_selectable_by_creator", true);

  if (error) {
    return {
      catalog: { byTypeAndSlug: new Map(), byType: {} },
      error: error.message
    };
  }

  const byTypeAndSlug = new Map<string, TaxonomyTerm>();
  const byType: Partial<Record<TaxonomyType, TaxonomyTerm[]>> = {};

  for (const row of data ?? []) {
    const term = mapTaxonomyTermRow(row as Record<string, unknown>);

    byTypeAndSlug.set(catalogKey(term.type, term.slug), term);
    if (!byType[term.type]) byType[term.type] = [];
    byType[term.type]!.push(term);
  }

  for (const type of Object.keys(byType) as TaxonomyType[]) {
    byType[type]?.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "vi"));
  }

  return { catalog: { byTypeAndSlug, byType }, error: null };
}

export function resolveCatalogTerm(
  catalog: TaxonomyCatalog,
  type: TaxonomyType,
  slugOrName: string
): TaxonomyTerm | null {
  const raw = slugOrName.trim();
  if (!raw) return null;

  const bySlug = catalog.byTypeAndSlug.get(catalogKey(type, raw));
  if (bySlug) return bySlug;

  const lower = raw.toLowerCase();
  const terms = catalog.byType[type] ?? [];
  return (
    terms.find(
      (term) =>
        term.name.toLowerCase() === lower ||
        term.slug.toLowerCase() === lower ||
        term.aliases.some((alias) => alias.toLowerCase() === lower)
    ) ?? null
  );
}

export function parsePipeSeparatedSlugs(value: string): string[] {
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}
