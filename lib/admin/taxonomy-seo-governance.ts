import {
  getTaxonomySeoTitle,
  isTaxonomySeoIndexable,
  rebuildTaxonomyCanonicalPath,
  resolveTaxonomyCanonicalPath,
  TAXONOMY_MIN_STORIES_FOR_INDEX
} from "@/lib/seo/taxonomy-seo";
import { createClient } from "@/lib/data/server";
import { mapTaxonomyTermRow } from "@/lib/taxonomy/map-row";
import { getPublishedStoryCountsByTermIds } from "@/lib/taxonomy/published-story-metrics";
import { taxonomyTermPublicUrl } from "@/lib/taxonomy/public-url";
import type { TaxonomyTermRow, TaxonomyType } from "@/types/taxonomy";

export type TaxonomySeoGovernanceAlert = {
  id: string;
  label: string;
  count: number;
  tone: "ok" | "warning" | "critical" | "info";
};

export type TaxonomySeoGovernanceRow = {
  id: string;
  type: TaxonomyType;
  name: string;
  slug: string;
  usage_count: number;
  use_for_seo: boolean;
  seo_indexable: boolean;
  is_public: boolean;
  is_active: boolean;
  seo_title: string | null;
  canonical_path: string | null;
  resolvedCanonical: string | null;
  indexable: boolean;
  publicUrl: string | null;
};

export type TaxonomySeoGovernanceSnapshot = {
  stats: {
    totalActivePublic: number;
    indexableCount: number;
    noindexCount: number;
    missingSeoTitle: number;
    missingDescription: number;
    noStories: number;
    inSitemap: number;
    duplicateSlugWarnings: number;
    missingCanonicalPath: number;
    seoButNotPublic: number;
    uuidSlugWarnings: number;
  };
  alerts: TaxonomySeoGovernanceAlert[];
  rows: TaxonomySeoGovernanceRow[];
  error: string | null;
};

const UUID_SLUG = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function loadTaxonomySeoGovernanceSnapshot(): Promise<TaxonomySeoGovernanceSnapshot> {
  const db = await createClient();
  const { data, error } = await db
    .from("taxonomy_terms")
    .select("*")
    .order("type")
    .order("sort_order", { ascending: true })
    .limit(2000);

  if (error) {
    return {
      stats: emptyStats(),
      alerts: [],
      rows: [],
      error: error.message
    };
  }

  const terms = (data ?? []).map(
    (row) => mapTaxonomyTermRow(row as Record<string, unknown>, { includeInternalNote: true }) as TaxonomyTermRow
  );

  const publishedCounts = await getPublishedStoryCountsByTermIds(
    terms.filter((t) => t.is_active).map((t) => t.id)
  );

  const slugByType = new Map<string, number>();
  let duplicateSlugWarnings = 0;
  let missingCanonicalPath = 0;
  let seoButNotPublic = 0;
  let uuidSlugWarnings = 0;
  let missingSeoTitle = 0;
  let missingDescription = 0;
  let noStories = 0;
  let indexableCount = 0;
  let noindexCount = 0;
  let inSitemap = 0;

  const rows: TaxonomySeoGovernanceRow[] = [];

  for (const term of terms) {
    const key = `${term.type}:${term.slug}`;
    slugByType.set(key, (slugByType.get(key) ?? 0) + 1);

    if (UUID_SLUG.test(term.slug)) uuidSlugWarnings += 1;
    if (term.use_for_seo && !term.is_public) seoButNotPublic += 1;
    if (term.is_active && term.is_public && !term.canonical_path?.trim()) {
      const auto = rebuildTaxonomyCanonicalPath(term);
      if (!auto) missingCanonicalPath += 1;
    }

    if (!term.seo_title?.trim() && term.use_for_seo) missingSeoTitle += 1;
    if (!term.seo_description?.trim() && !term.description?.trim() && term.use_for_seo) {
      missingDescription += 1;
    }
    if (term.usage_count === 0) noStories += 1;

    const publishedCount = publishedCounts.get(term.id) ?? term.usage_count;
    const indexable = isTaxonomySeoIndexable(term, publishedCount);
    if (term.is_active && term.is_public) {
      if (indexable) indexableCount += 1;
      else noindexCount += 1;
      if (indexable && term.use_for_seo && term.seo_indexable) inSitemap += 1;
    }

    rows.push({
      id: term.id,
      type: term.type,
      name: term.name,
      slug: term.slug,
      usage_count: publishedCounts.get(term.id) ?? term.usage_count,
      use_for_seo: term.use_for_seo,
      seo_indexable: term.seo_indexable,
      is_public: term.is_public,
      is_active: term.is_active,
      seo_title: term.seo_title,
      canonical_path: term.canonical_path,
      resolvedCanonical: resolveTaxonomyCanonicalPath(term),
      indexable,
      publicUrl: taxonomyTermPublicUrl(term.type, term.slug, term.is_public)
    });
  }

  for (const count of slugByType.values()) {
    if (count > 1) duplicateSlugWarnings += count;
  }

  const activePublic = terms.filter((t) => t.is_active && t.is_public).length;

  const alerts: TaxonomySeoGovernanceAlert[] = [
    {
      id: "indexable",
      label: "Taxonomy được index",
      count: indexableCount,
      tone: "ok"
    },
    {
      id: "noindex",
      label: "Taxonomy noindex",
      count: noindexCount,
      tone: "warning"
    },
    {
      id: "missing-title",
      label: "Thiếu SEO title",
      count: missingSeoTitle,
      tone: missingSeoTitle > 0 ? "warning" : "ok"
    },
    {
      id: "missing-desc",
      label: "Thiếu mô tả SEO",
      count: missingDescription,
      tone: missingDescription > 0 ? "warning" : "ok"
    },
    {
      id: "no-stories",
      label: "Không có truyện",
      count: noStories,
      tone: "info"
    },
    {
      id: "sitemap",
      label: "URL taxonomy trong sitemap",
      count: inSitemap,
      tone: "info"
    },
    {
      id: "duplicate-slug",
      label: "Cảnh báo slug trùng (cùng type)",
      count: duplicateSlugWarnings,
      tone: duplicateSlugWarnings > 0 ? "critical" : "ok"
    },
    {
      id: "missing-canonical",
      label: "Active nhưng không resolve canonical",
      count: missingCanonicalPath,
      tone: missingCanonicalPath > 0 ? "warning" : "ok"
    },
    {
      id: "seo-not-public",
      label: "use_for_seo nhưng không public",
      count: seoButNotPublic,
      tone: seoButNotPublic > 0 ? "critical" : "ok"
    },
    {
      id: "uuid-slug",
      label: "Slug dạng UUID",
      count: uuidSlugWarnings,
      tone: uuidSlugWarnings > 0 ? "critical" : "ok"
    }
  ];

  return {
    stats: {
      totalActivePublic: activePublic,
      indexableCount,
      noindexCount,
      missingSeoTitle,
      missingDescription,
      noStories,
      inSitemap,
      duplicateSlugWarnings,
      missingCanonicalPath,
      seoButNotPublic,
      uuidSlugWarnings
    },
    alerts,
    rows: rows.filter((row) => row.is_active),
    error: null
  };
}

function emptyStats() {
  return {
    totalActivePublic: 0,
    indexableCount: 0,
    noindexCount: 0,
    missingSeoTitle: 0,
    missingDescription: 0,
    noStories: 0,
    inSitemap: 0,
    duplicateSlugWarnings: 0,
    missingCanonicalPath: 0,
    seoButNotPublic: 0,
    uuidSlugWarnings: 0
  };
}

export function buildTaxonomySeoChecklistCsv(rows: TaxonomySeoGovernanceRow[]): string {
  const header = [
    "id",
    "type",
    "slug",
    "name",
    "usage_count",
    "use_for_seo",
    "seo_indexable",
    "indexable",
    "seo_title",
    "canonical_path",
    "resolved_canonical",
    "public_url"
  ].join(",");

  const lines = rows.map((row) =>
    [
      row.id,
      row.type,
      row.slug,
      `"${row.name.replace(/"/g, '""')}"`,
      row.usage_count,
      row.use_for_seo,
      row.seo_indexable,
      row.indexable,
      `"${(row.seo_title ?? getTaxonomySeoTitle({ name: row.name, seo_title: row.seo_title })).replace(/"/g, '""')}"`,
      row.canonical_path ?? "",
      row.resolvedCanonical ?? "",
      row.publicUrl ?? ""
    ].join(",")
  );

  return [header, ...lines].join("\n");
}

export { TAXONOMY_MIN_STORIES_FOR_INDEX };
