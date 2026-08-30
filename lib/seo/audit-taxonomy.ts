import {
  isTaxonomySeoIndexable,
  rebuildTaxonomyCanonicalPath,
  resolveTaxonomyCanonicalPath,
  TAXONOMY_MIN_STORIES_FOR_INDEX
} from "@/lib/seo/taxonomy-seo";
import { createClient } from "@/lib/data/server";
import { mapTaxonomyTermRow } from "@/lib/taxonomy/map-row";
import { getPublishedStoryCountsByTermIds } from "@/lib/taxonomy/published-story-metrics";
import type { TaxonomyTermRow } from "@/types/taxonomy";
import type { SeoAuditFinding } from "@/lib/seo/audit";

const UUID_SLUG = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function finding(
  partial: Omit<SeoAuditFinding, "id"> & { id?: string }
): SeoAuditFinding {
  return {
    id: partial.id ?? `taxonomy:${partial.issue_type}:${partial.route}`,
    ...partial
  };
}

export async function runTaxonomySeoAuditFindings(): Promise<SeoAuditFinding[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("taxonomy_terms")
    .select("*")
    .eq("is_active", true)
    .limit(1500);

  if (error || !data) {
    return [];
  }

  const terms = data.map(
    (row) => mapTaxonomyTermRow(row as Record<string, unknown>, { includeInternalNote: true }) as TaxonomyTermRow
  );

  const publishedCounts = await getPublishedStoryCountsByTermIds(terms.map((t) => t.id));
  const findings: SeoAuditFinding[] = [];
  const slugKeys = new Map<string, string[]>();

  for (const term of terms) {
    const key = `${term.type}:${term.slug}`;
    const ids = slugKeys.get(key) ?? [];
    ids.push(term.id);
    slugKeys.set(key, ids);

    const route = resolveTaxonomyCanonicalPath(term) ?? `/kham-pha/${term.type}/${term.slug}`;
    const publishedCount = publishedCounts.get(term.id) ?? term.usage_count;

    if (term.use_for_seo && !term.is_public) {
      findings.push(
        finding({
          severity: "critical",
          issue_type: "taxonomy_seo_not_public",
          route,
          message: `Taxonomy "${term.name}" bật use_for_seo nhưng is_public=false.`,
          metadata: { term_id: term.id, type: term.type }
        })
      );
    }

    if (UUID_SLUG.test(term.slug)) {
      findings.push(
        finding({
          severity: "critical",
          issue_type: "taxonomy_uuid_slug",
          route,
          message: `Taxonomy "${term.name}" dùng slug UUID — không đưa vào sitemap.`,
          metadata: { term_id: term.id, slug: term.slug }
        })
      );
    }

    if (term.use_for_seo && term.is_public && !term.seo_title?.trim()) {
      findings.push(
        finding({
          severity: "warning",
          issue_type: "taxonomy_missing_seo_title",
          route,
          message: `Taxonomy "${term.name}" thiếu seo_title (đang dùng fallback).`,
          metadata: { term_id: term.id }
        })
      );
    }

    if (term.is_public && !resolveTaxonomyCanonicalPath(term) && !rebuildTaxonomyCanonicalPath(term)) {
      findings.push(
        finding({
          severity: "error",
          issue_type: "taxonomy_missing_canonical",
          route: `/admin/taxonomy`,
          message: `Taxonomy "${term.name}" (${term.type}) không resolve được canonical path.`,
          metadata: { term_id: term.id }
        })
      );
    }

    if (
      term.use_for_seo &&
      term.seo_indexable &&
      term.is_public &&
      publishedCount < TAXONOMY_MIN_STORIES_FOR_INDEX &&
      term.min_stories_override == null
    ) {
      findings.push(
        finding({
          severity: "info",
          issue_type: "taxonomy_below_story_threshold",
          route,
          message: `Taxonomy "${term.name}" có ${publishedCount} truyện (< ${TAXONOMY_MIN_STORIES_FOR_INDEX}) — mặc định noindex.`,
          metadata: { term_id: term.id, published_count: publishedCount }
        })
      );
    }

    if (term.use_for_seo && !isTaxonomySeoIndexable(term, publishedCount) && term.is_public) {
      findings.push(
        finding({
          severity: "info",
          issue_type: "taxonomy_noindex",
          route,
          message: `Taxonomy "${term.name}" không đủ điều kiện index SEO.`,
          metadata: {
            term_id: term.id,
            seo_indexable: term.seo_indexable,
            published_count: publishedCount
          }
        })
      );
    }
  }

  for (const [key, ids] of slugKeys) {
    if (ids.length > 1) {
      const [type, slug] = key.split(":");
      findings.push(
        finding({
          severity: "critical",
          issue_type: "taxonomy_duplicate_slug",
          route: `/admin/taxonomy`,
          message: `Slug "${slug}" trùng ${ids.length} lần trong type ${type}.`,
          metadata: { term_ids: ids, type, slug }
        })
      );
    }
  }

  return findings;
}
