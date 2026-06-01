import { ADMIN_ONLY_TAXONOMY_TYPES } from "@/lib/taxonomy/constants";
import { isPresentationModeSupportedByComposer } from "@/lib/taxonomy/presentation-bridge";
import { taxonomyParentTypeFor } from "@/lib/taxonomy/parent-types";
import {
  BLOCKED_TAXONOMY_TYPE_VALUES,
  isValidTaxonomyTypeValue
} from "@/lib/taxonomy/import-export/constants";
import type {
  TaxonomyImportParsedRow,
  TaxonomyImportPreviewResult,
  TaxonomyImportValidationIssue
} from "@/types/taxonomy-import-export";
import type { TaxonomyType } from "@/types/taxonomy";

export type ExistingTermSnapshot = {
  id: string;
  type: TaxonomyType;
  slug: string;
  usageCount: number;
  aliases: string[];
};

function issue(
  rowNumber: number,
  field: string,
  value: string,
  errorCode: string,
  severity: "error" | "warning",
  message: string
): TaxonomyImportValidationIssue {
  return { rowNumber, field, value, errorCode, severity, message };
}

function termKey(type: string, slug: string) {
  return `${type}:${slug}`;
}

function detectParentLoop(
  rows: TaxonomyImportParsedRow[],
  fileKeys: Set<string>
): TaxonomyImportValidationIssue[] {
  const issues: TaxonomyImportValidationIssue[] = [];
  const parentOf = new Map<string, string | null>();

  for (const row of rows) {
    const key = termKey(row.type, row.slug);
    if (!row.parentSlug?.trim()) {
      parentOf.set(key, null);
      continue;
    }
    const expectedParentType =
      row.parentType?.trim() || taxonomyParentTypeFor(row.type);
    if (!expectedParentType) {
      parentOf.set(key, null);
      continue;
    }
    parentOf.set(key, termKey(expectedParentType, row.parentSlug.trim()));
  }

  for (const row of rows) {
    const start = termKey(row.type, row.slug);
    const visited = new Set<string>();
    let current: string | null | undefined = parentOf.get(start) ?? null;

    while (current) {
      if (current === start) {
        issues.push(
          issue(
            row.rowNumber,
            "parent_slug",
            row.parentSlug ?? "",
            "parent_loop",
            "error",
            "Parent tạo vòng lặp phân cấp."
          )
        );
        break;
      }
      if (visited.has(current)) break;
      visited.add(current);
      if (!fileKeys.has(current)) {
        break;
      }
      current = parentOf.get(current) ?? null;
    }
  }

  return issues;
}

export function validateTaxonomyImportRows(input: {
  rows: TaxonomyImportParsedRow[];
  existingTerms: ExistingTermSnapshot[];
  mode: "create_only" | "update_by_type_slug" | "upsert_by_type_slug" | "disable_missing_in_file";
  aliasConflictAsError?: boolean;
}): TaxonomyImportPreviewResult {
  const issues: TaxonomyImportValidationIssue[] = [];
  const existingByKey = new Map<string, ExistingTermSnapshot>();
  const aliasOwner = new Map<string, string>();

  for (const term of input.existingTerms) {
    existingByKey.set(termKey(term.type, term.slug), term);
    for (const alias of term.aliases) {
      aliasOwner.set(`${term.type}:${alias.toLowerCase()}`, termKey(term.type, term.slug));
    }
  }

  const fileKeys = new Set(input.rows.map((r) => termKey(r.type, r.slug)));
  const slugSeenInFile = new Map<string, number>();

  for (const row of input.rows) {
    const key = termKey(row.type, row.slug);
    const typeRaw = row.type;

    if (BLOCKED_TAXONOMY_TYPE_VALUES.has(typeRaw)) {
      issues.push(
        issue(
          row.rowNumber,
          "type",
          typeRaw,
          "composer_block_as_type",
          "error",
          `"${typeRaw}" là Composer block type, không phải taxonomy term.`
        )
      );
    }

    if (!isValidTaxonomyTypeValue(typeRaw)) {
      issues.push(
        issue(
          row.rowNumber,
          "type",
          typeRaw,
          "invalid_type",
          "error",
          `Type "${typeRaw}" không hợp lệ.`
        )
      );
    }

    if (!row.name.trim()) {
      issues.push(
        issue(row.rowNumber, "name", "", "required", "error", "Tên là bắt buộc.")
      );
    }

    if (!row.slug.trim()) {
      issues.push(
        issue(row.rowNumber, "slug", "", "required", "error", "Slug là bắt buộc.")
      );
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)) {
      issues.push(
        issue(
          row.rowNumber,
          "slug",
          row.slug,
          "invalid_slug",
          "error",
          "Slug chỉ dùng chữ thường, số và dấu gạch ngang."
        )
      );
    }

    if (slugSeenInFile.has(key)) {
      issues.push(
        issue(
          row.rowNumber,
          "slug",
          row.slug,
          "duplicate_in_file",
          "error",
          `Trùng type+slug trong file (dòng ${slugSeenInFile.get(key)}).`
        )
      );
    } else {
      slugSeenInFile.set(key, row.rowNumber);
    }

    const exists = existingByKey.has(key);
    if (input.mode === "create_only" && exists) {
      issues.push(
        issue(
          row.rowNumber,
          "slug",
          row.slug,
          "already_exists",
          "error",
          `Term ${key} đã tồn tại — mode create_only.`
        )
      );
    }
    if (input.mode === "update_by_type_slug" && !exists) {
      issues.push(
        issue(
          row.rowNumber,
          "slug",
          row.slug,
          "not_found",
          "error",
          `Term ${key} chưa tồn tại — mode update_by_type_slug.`
        )
      );
    }

    if (row.parentSlug?.trim()) {
      const expectedParentType =
        row.parentType?.trim() || taxonomyParentTypeFor(row.type);
      if (!expectedParentType) {
        issues.push(
          issue(
            row.rowNumber,
            "parent_slug",
            row.parentSlug,
            "parent_not_allowed",
            "error",
            `Type ${row.type} không hỗ trợ parent.`
          )
        );
      } else {
        const parentKey = termKey(expectedParentType, row.parentSlug.trim());
        const inFile = fileKeys.has(parentKey);
        const inDb = existingByKey.has(parentKey);
        if (!inFile && !inDb) {
          issues.push(
            issue(
              row.rowNumber,
              "parent_slug",
              row.parentSlug,
              "parent_not_found",
              "error",
              `Parent ${parentKey} không tìm thấy trong DB hoặc file.`
            )
          );
        }
        if (
          row.parentType?.trim() &&
          row.parentType.trim() !== expectedParentType
        ) {
          issues.push(
            issue(
              row.rowNumber,
              "parent_type",
              row.parentType,
              "parent_type_mismatch",
              "error",
              `parent_type phải là ${expectedParentType} cho ${row.type}.`
            )
          );
        }
      }
    }

    for (const alias of row.aliases) {
      if (alias.toLowerCase() === row.slug.toLowerCase()) {
        issues.push(
          issue(
            row.rowNumber,
            "aliases",
            alias,
            "alias_equals_slug",
            "error",
            "Alias trùng slug chính."
          )
        );
      }
      const aliasKey = `${row.type}:${alias.toLowerCase()}`;
      const owner = aliasOwner.get(aliasKey);
      if (owner && owner !== key) {
        issues.push(
          issue(
            row.rowNumber,
            "aliases",
            alias,
            "alias_conflict",
            input.aliasConflictAsError ? "error" : "warning",
            `Alias "${alias}" trùng term khác (${owner}). Không tự merge.`
          )
        );
      }
    }

    if (
      row.isSelectableByCreator &&
      ADMIN_ONLY_TAXONOMY_TYPES.includes(row.type)
    ) {
      issues.push(
        issue(
          row.rowNumber,
          "is_selectable_by_creator",
          "true",
          "admin_only_type",
          "error",
          `${row.type} không cho creator chọn trực tiếp.`
        )
      );
    }

    if (
      row.type === "content_warning" &&
      !row.useForModeration
    ) {
      issues.push(
        issue(
          row.rowNumber,
          "use_for_moderation",
          "false",
          "content_warning_moderation",
          "warning",
          "content_warning nên use_for_moderation=true."
        )
      );
    }

    if (
      row.type === "presentation_mode" &&
      row.isSelectableByCreator &&
      !isPresentationModeSupportedByComposer(row.slug)
    ) {
      issues.push(
        issue(
          row.rowNumber,
          "slug",
          row.slug,
          "presentation_mode_composer",
          "error",
          `presentation_mode "${row.slug}" không map ComposerMode khi creator_selectable=true.`
        )
      );
    }

    if (
      row.sitemapPriority != null &&
      (row.sitemapPriority < 0 || row.sitemapPriority > 1)
    ) {
      issues.push(
        issue(
          row.rowNumber,
          "sitemap_priority",
          String(row.sitemapPriority),
          "invalid_sitemap_priority",
          "error",
          "sitemap_priority phải từ 0 đến 1."
        )
      );
    }

    if (!Number.isFinite(row.sortOrder)) {
      issues.push(
        issue(
          row.rowNumber,
          "sort_order",
          String(row.sortOrder),
          "invalid_sort_order",
          "error",
          "sort_order phải là số."
        )
      );
    }

    if (
      !row.isActive &&
      exists &&
      (existingByKey.get(key)?.usageCount ?? 0) > 0
    ) {
      issues.push(
        issue(
          row.rowNumber,
          "is_active",
          "false",
          "deactivate_in_use",
          "warning",
          `Term đang được ${existingByKey.get(key)?.usageCount} truyện dùng — set inactive.`
        )
      );
    }
  }

  issues.push(...detectParentLoop(input.rows, fileKeys));

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    rows: input.rows,
    issues,
    canImport: errorCount === 0,
    errorCount,
    warningCount
  };
}

export function parsedRowToUpsertInput(row: TaxonomyImportParsedRow) {
  return {
    type: row.type,
    slug: row.slug,
    name: row.name,
    description: row.description,
    display_label: row.displayLabel,
    internal_note: row.internalNote,
    icon: row.icon,
    color: row.color,
    aliases: row.aliases,
    is_active: row.isActive,
    is_public: row.isPublic,
    is_selectable_by_creator: row.isSelectableByCreator,
    is_featured: row.isFeatured,
    use_for_seo: row.useForSeo,
    use_for_discover: row.useForDiscover,
    use_for_ranking: row.useForRanking,
    use_for_moderation: row.useForModeration,
    sort_order: row.sortOrder,
    seo_title: row.seoTitle,
    seo_description: row.seoDescription,
    seo_h1: row.seoH1,
    seo_intro: row.seoIntro,
    seo_indexable: row.seoIndexable,
    sitemap_priority: row.sitemapPriority,
    sitemap_changefreq: row.sitemapChangefreq,
    canonical_path: row.canonicalPath
  };
}
