import type { TaxonomyType } from "@/types/taxonomy";
import { TAXONOMY_TYPES } from "@/types/taxonomy";
import { TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";

/** Primary segmented navigation — replaces long horizontal tab rows. */
export type TaxonomyAdminTabId =
  | "overview"
  | "manage"
  | "requests"
  | "quality"
  | "import_export"
  | "audit"
  | "templates";

/** @deprecated Legacy tab ids — mapped to new segments via parseTaxonomyAdminTab(). */
export type TaxonomyAdminLegacyTabId =
  | "structure"
  | "content_tags"
  | "safety"
  | "system";

export type TaxonomyAdminSegment = {
  id: TaxonomyAdminTabId;
  label: string;
  description?: string;
};

export const TAXONOMY_ADMIN_SEGMENTS: TaxonomyAdminSegment[] = [
  {
    id: "overview",
    label: "Tổng quan",
    description: "Sức khỏe taxonomy và hướng dẫn vận hành."
  },
  {
    id: "manage",
    label: "Quản lý taxonomy",
    description: "Danh sách, lọc, thêm/sửa/gộp taxonomy."
  },
  {
    id: "requests",
    label: "Yêu cầu thêm tag",
    description: "Duyệt tag mới từ creator."
  },
  {
    id: "quality",
    label: "Chất lượng taxonomy",
    description: "Phát hiện trùng, mơ hồ, thiếu SEO."
  },
  {
    id: "import_export",
    label: "Import / Export",
    description: "Nhập/xuất CSV/JSON với preview."
  },
  {
    id: "audit",
    label: "Nhật ký",
    description: "Lịch sử thao tác admin."
  }
];

export type TaxonomyGroupOption = {
  value: TaxonomyType | "all";
  label: string;
};

/** Group filter for the manage workspace — one dropdown instead of many tabs. */
export const TAXONOMY_GROUP_OPTIONS: TaxonomyGroupOption[] = [
  { value: "all", label: "Tất cả nhóm" },
  ...TAXONOMY_TYPES.map((type) => ({
    value: type,
    label: TAXONOMY_TYPE_LABELS[type]
  }))
];

export const TAXONOMY_IMPORT_EXPORT_HREF = "/admin/taxonomy?tab=import_export";
export const TAXONOMY_ANALYTICS_HREF = "/admin/taxonomy-analytics";
export const TAXONOMY_CONTENT_QUALITY_HREF = "/admin/content-taxonomy-quality";
export const TAXONOMY_TEMPLATES_TAB = "templates" as const;

export const TAXONOMY_ADMIN_PAGE_SIZE = 25;

export type TaxonomyTermSort =
  | "updated_desc"
  | "usage_desc"
  | "usage_asc"
  | "name_asc"
  | "warnings_first";

export type TaxonomyTermStatusFilter =
  | "all"
  | "active"
  | "disabled"
  | "deprecated";

export type TaxonomyUsageFilter = "all" | "unused" | "low" | "high";

const LEGACY_TAB_TO_SEGMENT: Record<string, TaxonomyAdminTabId> = {
  structure: "manage",
  content_tags: "manage",
  safety: "manage",
  system: "manage"
};

const LEGACY_TAB_TO_GROUP: Partial<Record<string, TaxonomyType>> = {
  structure: "content_type",
  content_tags: "trope_tag",
  safety: "content_warning",
  system: "editorial_tag"
};

export function parseTaxonomyAdminTab(raw: string | undefined): TaxonomyAdminTabId {
  const segmentIds = [
    ...TAXONOMY_ADMIN_SEGMENTS.map((s) => s.id),
    TAXONOMY_TEMPLATES_TAB
  ];
  if (raw && segmentIds.includes(raw as TaxonomyAdminTabId)) {
    return raw as TaxonomyAdminTabId;
  }
  if (raw && raw in LEGACY_TAB_TO_SEGMENT) {
    return LEGACY_TAB_TO_SEGMENT[raw]!;
  }
  return "overview";
}

export function legacyTabDefaultGroup(raw: string | undefined): TaxonomyType | "all" {
  if (!raw) return "all";
  return LEGACY_TAB_TO_GROUP[raw] ?? "all";
}

export function parseTaxonomyGroupFilter(raw: string | undefined): TaxonomyType | "all" {
  if (!raw || raw === "all") return "all";
  if (TAXONOMY_TYPES.includes(raw as TaxonomyType)) {
    return raw as TaxonomyType;
  }
  return "all";
}

/** @deprecated Use TAXONOMY_ADMIN_SEGMENTS */
export const TAXONOMY_ADMIN_TAB_GROUPS = TAXONOMY_ADMIN_SEGMENTS;

/** @deprecated Use parseTaxonomyAdminTab */
export function typesForAdminTab(tab: TaxonomyAdminTabId): TaxonomyType[] | undefined {
  if (tab !== "manage") return undefined;
  return [...TAXONOMY_TYPES];
}
