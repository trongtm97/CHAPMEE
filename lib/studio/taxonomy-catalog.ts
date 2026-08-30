import { createClient } from "@/lib/data/server";
import { CREATOR_ASSIGNABLE_TAXONOMY_TYPES } from "@/lib/taxonomy/constants";
import { mapTaxonomyTermRow } from "@/lib/taxonomy/map-row";
import { slugifyVietnamese } from "@/lib/seo/slugify-vi";
import { removeVietnameseTones } from "@/lib/utilities/vietnamese-tone-remover";
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
  const db = await createClient();
  const { data, error } = await db
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

function normalizeImportTaxonomyMatchKey(value: string): string {
  return removeVietnameseTones(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugVariants(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  const hyphenSlug = slugifyVietnamese(trimmed);
  const underscoreSlug = hyphenSlug.replace(/-/g, "_");
  const compact = trimmed.toLowerCase().replace(/\s+/g, "_");
  const dashed = trimmed.toLowerCase().replace(/\s+/g, "-");

  return [...new Set([trimmed, hyphenSlug, underscoreSlug, compact, dashed].filter(Boolean))];
}

function termMatchKeys(term: TaxonomyTerm): Set<string> {
  const labels = [term.slug, term.name, term.display_label, ...term.aliases].filter(
    Boolean
  ) as string[];

  const keys = new Set<string>();
  for (const label of labels) {
    keys.add(label.toLowerCase());
    keys.add(normalizeImportTaxonomyMatchKey(label));
    for (const variant of slugVariants(label)) {
      keys.add(variant.toLowerCase());
      keys.add(normalizeImportTaxonomyMatchKey(variant));
    }
  }

  return keys;
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

  const inputKeys = new Set<string>();
  inputKeys.add(raw.toLowerCase());
  inputKeys.add(normalizeImportTaxonomyMatchKey(raw));
  for (const variant of slugVariants(raw)) {
    inputKeys.add(variant.toLowerCase());
    inputKeys.add(normalizeImportTaxonomyMatchKey(variant));
  }

  const terms = catalog.byType[type] ?? [];
  return (
    terms.find((term) => {
      const keys = termMatchKeys(term);
      for (const key of inputKeys) {
        if (keys.has(key)) return true;
      }
      return false;
    }) ?? null
  );
}

/** Parse danh sách taxonomy trong ô import — phẩy, chấm phẩy (Excel VN), hoặc | cũ. */
export function parseImportTaxonomyValues(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  let parts: string[];
  if (trimmed.includes("|")) {
    parts = trimmed.split("|");
  } else if (trimmed.includes(";")) {
    parts = trimmed.split(";");
  } else {
    parts = trimmed.split(",");
  }

  return parts.map((part) => part.trim()).filter(Boolean);
}

/** @deprecated Dùng parseImportTaxonomyValues */
export function parsePipeSeparatedSlugs(value: string): string[] {
  return parseImportTaxonomyValues(value);
}
