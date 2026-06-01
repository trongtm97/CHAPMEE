import type { TaxonomyTermRow, TaxonomyType } from "@/types/taxonomy";

export type CatalogQualitySeverity = "info" | "warning" | "critical";

export type CatalogQualityCategory =
  | "duplicate_alias"
  | "similar_slug"
  | "unused"
  | "overused"
  | "underused"
  | "vague_name"
  | "creator_disabled"
  | "missing_seo"
  | "seo_index_thin"
  | "composer_format";

export type CatalogQualityIssue = {
  id: string;
  category: CatalogQualityCategory;
  severity: CatalogQualitySeverity;
  title: string;
  description: string;
  termId: string;
  termName: string;
  termSlug: string;
  termType: TaxonomyType;
  relatedTermIds?: string[];
};

export type CatalogQualitySummary = {
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  issues: CatalogQualityIssue[];
};

const VAGUE_NAMES = new Set([
  "tag",
  "other",
  "misc",
  "general",
  "unknown",
  "khac",
  "chung",
  "tam"
]);

const HIGH_USAGE_THRESHOLD = 500;
const LOW_USAGE_THRESHOLD = 2;

function slugDistance(a: string, b: string): number {
  if (a === b) return 0;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  if (longer.length === 0) return 0;
  if (longer.startsWith(shorter) || shorter.startsWith(longer.slice(0, -1))) {
    return 1;
  }
  return longer.length - shorter.length > 2 ? 99 : 2;
}

function deriveStatus(term: TaxonomyTermRow): "active" | "disabled" | "deprecated" {
  if (term.is_active) return "active";
  if (term.usage_count > 0) return "deprecated";
  return "disabled";
}

export function detectCatalogQualityIssues(terms: TaxonomyTermRow[]): CatalogQualityIssue[] {
  const issues: CatalogQualityIssue[] = [];
  const aliasIndex = new Map<string, { termId: string; name: string; type: TaxonomyType }[]>();

  for (const term of terms) {
    for (const alias of term.aliases) {
      const key = `${term.type}:${alias.trim().toLowerCase()}`;
      const list = aliasIndex.get(key) ?? [];
      list.push({ termId: term.id, name: term.name, type: term.type });
      aliasIndex.set(key, list);
    }
  }

  for (const [key, entries] of aliasIndex) {
    if (entries.length < 2) continue;
    const [, alias] = key.split(":");
    for (const entry of entries) {
      issues.push({
        id: `dup-alias-${entry.termId}-${alias}`,
        category: "duplicate_alias",
        severity: "warning",
        title: "Alias trùng nghĩa",
        description: `Alias "${alias}" cũng xuất hiện ở ${entries.length - 1} taxonomy khác cùng nhóm.`,
        termId: entry.termId,
        termName: entry.name,
        termSlug: alias,
        termType: entry.type,
        relatedTermIds: entries.filter((e) => e.termId !== entry.termId).map((e) => e.termId)
      });
    }
  }

  const byType = new Map<TaxonomyType, TaxonomyTermRow[]>();
  for (const term of terms) {
    const list = byType.get(term.type) ?? [];
    list.push(term);
    byType.set(term.type, list);
  }

  for (const [type, group] of byType) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]!;
        const b = group[j]!;
        const dist = slugDistance(a.slug, b.slug);
        if (dist > 0 && dist <= 2) {
          issues.push({
            id: `similar-slug-${a.id}-${b.id}`,
            category: "similar_slug",
            severity: "info",
            title: "Slug gần giống",
            description: `"${a.slug}" và "${b.slug}" có thể gây nhầm lẫn.`,
            termId: a.id,
            termName: a.name,
            termSlug: a.slug,
            termType: type,
            relatedTermIds: [b.id]
          });
        }
      }
    }
  }

  for (const term of terms) {
    const status = deriveStatus(term);

    if (status === "active" && term.usage_count === 0 && term.is_selectable_by_creator) {
      issues.push({
        id: `unused-${term.id}`,
        category: "unused",
        severity: "info",
        title: "Chưa có usage",
        description: "Taxonomy đang bật cho creator nhưng chưa có truyện nào dùng.",
        termId: term.id,
        termName: term.name,
        termSlug: term.slug,
        termType: term.type
      });
    }

    if (term.usage_count >= HIGH_USAGE_THRESHOLD) {
      issues.push({
        id: `overused-${term.id}`,
        category: "overused",
        severity: "warning",
        title: "Usage quá cao",
        description: `${term.usage_count} truyện — tag có thể quá rộng, cân nhắc tách nhỏ.`,
        termId: term.id,
        termName: term.name,
        termSlug: term.slug,
        termType: term.type
      });
    }

    if (
      status === "active" &&
      term.usage_count > 0 &&
      term.usage_count <= LOW_USAGE_THRESHOLD &&
      term.type === "trope_tag"
    ) {
      issues.push({
        id: `underused-${term.id}`,
        category: "underused",
        severity: "info",
        title: "Usage rất thấp",
        description: `Chỉ ${term.usage_count} truyện — cân nhắc gộp hoặc tắt.`,
        termId: term.id,
        termName: term.name,
        termSlug: term.slug,
        termType: term.type
      });
    }

    const normalizedName = term.name.trim().toLowerCase();
    if (
      normalizedName.length <= 3 ||
      VAGUE_NAMES.has(normalizedName) ||
      VAGUE_NAMES.has(term.slug)
    ) {
      issues.push({
        id: `vague-${term.id}`,
        category: "vague_name",
        severity: "warning",
        title: "Tên mơ hồ",
        description: "Tên hoặc slug quá ngắn/chung chung — khó phân loại chính xác.",
        termId: term.id,
        termName: term.name,
        termSlug: term.slug,
        termType: term.type
      });
    }

    if (!term.is_active && term.is_selectable_by_creator) {
      issues.push({
        id: `creator-disabled-${term.id}`,
        category: "creator_disabled",
        severity: "critical",
        title: "Creator chọn được nhưng đã tắt",
        description: "Cờ creator_selectable vẫn bật trong khi taxonomy không active.",
        termId: term.id,
        termName: term.name,
        termSlug: term.slug,
        termType: term.type
      });
    }

    if (term.use_for_seo && !term.seo_title?.trim() && !term.seo_description?.trim()) {
      issues.push({
        id: `missing-seo-${term.id}`,
        category: "missing_seo",
        severity: "warning",
        title: "Thiếu SEO metadata",
        description: "Bật SEO nhưng chưa có title/description template.",
        termId: term.id,
        termName: term.name,
        termSlug: term.slug,
        termType: term.type
      });
    }

    if (
      term.seo_indexable &&
      term.use_for_seo &&
      (!term.seo_intro?.trim() || !term.seo_h1?.trim())
    ) {
      issues.push({
        id: `seo-thin-${term.id}`,
        category: "seo_index_thin",
        severity: "warning",
        title: "Landing index thiếu nội dung",
        description: "Cho phép index nhưng thiếu H1 hoặc intro cho trang landing.",
        termId: term.id,
        termName: term.name,
        termSlug: term.slug,
        termType: term.type
      });
    }

    if (term.type === "presentation_mode" && term.is_active && !term.description?.trim()) {
      issues.push({
        id: `composer-${term.id}`,
        category: "composer_format",
        severity: "info",
        title: "Format thiếu mô tả Composer",
        description: "Format trình bày nên có mô tả ngắn; cấu hình block tại Studio Composer.",
        termId: term.id,
        termName: term.name,
        termSlug: term.slug,
        termType: term.type
      });
    }
  }

  const seen = new Set<string>();
  return issues.filter((issue) => {
    if (seen.has(issue.id)) return false;
    seen.add(issue.id);
    return true;
  });
}

export function summarizeCatalogQuality(issues: CatalogQualityIssue[]): CatalogQualitySummary {
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  for (const issue of issues) {
    if (issue.severity === "critical") criticalCount++;
    else if (issue.severity === "warning") warningCount++;
    else infoCount++;
  }
  return {
    totalIssues: issues.length,
    criticalCount,
    warningCount,
    infoCount,
    issues
  };
}

export const CATALOG_QUALITY_CATEGORY_LABELS: Record<CatalogQualityCategory, string> = {
  duplicate_alias: "Alias trùng nghĩa",
  similar_slug: "Slug gần giống",
  unused: "Chưa có usage",
  overused: "Usage quá cao",
  underused: "Usage quá thấp",
  vague_name: "Tên mơ hồ",
  creator_disabled: "Creator chọn được nhưng đã tắt",
  missing_seo: "Thiếu SEO metadata",
  seo_index_thin: "Landing index thiếu nội dung",
  composer_format: "Ảnh hưởng Composer format"
};
