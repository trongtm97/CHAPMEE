import { createClient } from "@/lib/data/server";
import { taxonomyParentTypeFor } from "@/lib/taxonomy/parent-types";
import {
  TAXONOMY_EXPORT_COLUMNS,
  rowToCsvLine
} from "@/lib/taxonomy/import-export/columns";
import type { TaxonomyExportFilters } from "@/types/taxonomy-import-export";
import type { TaxonomyTermRow } from "@/types/taxonomy";

export async function exportTaxonomyTermsAdvanced(filters: TaxonomyExportFilters = {}) {
  const db = await createClient();

  let query = db
    .from("taxonomy_terms")
    .select("*")
    .order("type", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (filters.type) query = query.eq("type", filters.type);
  else if (filters.types?.length) query = query.in("type", filters.types);

  if (filters.activeOnly) query = query.eq("is_active", true);
  if (filters.inactiveOnly) query = query.eq("is_active", false);
  if (filters.isPublic === true) query = query.eq("is_public", true);
  if (filters.isPublic === false) query = query.eq("is_public", false);
  if (filters.creatorSelectable === true) {
    query = query.eq("is_selectable_by_creator", true);
  }
  if (filters.creatorSelectable === false) {
    query = query.eq("is_selectable_by_creator", false);
  }
  if (filters.useForSeo === true) query = query.eq("use_for_seo", true);
  if (filters.useForDiscover === true) query = query.eq("use_for_discover", true);
  if (filters.useForRanking === true) query = query.eq("use_for_ranking", true);

  const { data, error } = await query.limit(10000);

  if (error) {
    return { csv: "", rowCount: 0, terms: [] as TaxonomyTermRow[], error: error.message };
  }

  const terms = (data ?? []) as TaxonomyTermRow[];
  const parentIds = [...new Set(terms.map((t) => t.parent_id).filter(Boolean))] as string[];
  const parentMap = new Map<string, { slug: string; type: string }>();

  if (parentIds.length > 0) {
    const { data: parents } = await db
      .from("taxonomy_terms")
      .select("id, slug, type")
      .in("id", parentIds);
    for (const p of parents ?? []) {
      parentMap.set(String(p.id), {
        slug: String(p.slug),
        type: String(p.type)
      });
    }
  }

  const lines = [TAXONOMY_EXPORT_COLUMNS.join(",")];

  for (const term of terms) {
    const parent = term.parent_id ? parentMap.get(term.parent_id) : null;
    const aliases = Array.isArray(term.aliases)
      ? (term.aliases as string[]).join("|")
      : "";

    const values = [
      term.type,
      parent?.type ?? taxonomyParentTypeFor(term.type) ?? "",
      parent?.slug ?? "",
      term.name,
      term.slug,
      term.description ?? "",
      term.display_label ?? "",
      aliases,
      term.icon ?? "",
      term.color ?? "",
      String(term.is_active),
      String(term.is_public),
      String(term.is_selectable_by_creator),
      String(term.is_featured),
      String(term.use_for_seo),
      String(term.use_for_discover),
      String(term.use_for_ranking),
      String(term.use_for_moderation),
      String(term.sort_order),
      term.seo_title ?? "",
      term.seo_description ?? "",
      term.seo_h1 ?? "",
      term.seo_intro ?? "",
      String(term.seo_indexable ?? true),
      term.sitemap_priority != null ? String(term.sitemap_priority) : "",
      term.sitemap_changefreq ?? "",
      term.canonical_path ?? "",
      term.internal_note ?? ""
    ];

    lines.push(rowToCsvLine(values));
  }

  return { csv: `\uFEFF${lines.join("\n")}`, rowCount: terms.length, terms, error: null };
}

export async function loadExistingTermsSnapshot() {
  const db = await createClient();
  const { data, error } = await db
    .from("taxonomy_terms")
    .select("id, type, slug, usage_count, aliases")
    .limit(10000);

  if (error || !data) return { terms: [], error: error?.message ?? null };

  return {
    terms: data.map((row) => ({
      id: String(row.id),
      type: row.type as TaxonomyTermRow["type"],
      slug: String(row.slug),
      usageCount: Number(row.usage_count ?? 0),
      aliases: Array.isArray(row.aliases) ? (row.aliases as string[]) : []
    })),
    error: null
  };
}
