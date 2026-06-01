import type { TaxonomyType } from "@/types/taxonomy";

export type TaxonomyImportExportFormat = "csv" | "xlsx";

export type TaxonomyImportMode =
  | "create_only"
  | "update_by_type_slug"
  | "upsert_by_type_slug"
  | "disable_missing_in_file";

/** Legacy aliases used by older modal — mapped in actions. */
export type TaxonomyImportModeLegacy = "create" | "update" | "upsert";

export type TaxonomyImportExportDirection = "import" | "export";

export type TaxonomyImportExportJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "partially_completed";

export type TaxonomyExportFilters = {
  type?: TaxonomyType;
  types?: TaxonomyType[];
  activeOnly?: boolean;
  inactiveOnly?: boolean;
  isPublic?: boolean;
  creatorSelectable?: boolean;
  useForSeo?: boolean;
  useForDiscover?: boolean;
  useForRanking?: boolean;
};

export type TaxonomyImportValidationIssue = {
  rowNumber: number;
  field: string;
  value: string;
  errorCode: string;
  severity: "error" | "warning";
  message: string;
};

export type TaxonomyImportParsedRow = {
  rowNumber: number;
  type: TaxonomyType;
  parentType: string | null;
  parentSlug: string | null;
  name: string;
  slug: string;
  description: string | null;
  displayLabel: string | null;
  aliases: string[];
  icon: string | null;
  color: string | null;
  isActive: boolean;
  isPublic: boolean;
  isSelectableByCreator: boolean;
  isFeatured: boolean;
  useForSeo: boolean;
  useForDiscover: boolean;
  useForRanking: boolean;
  useForModeration: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoH1: string | null;
  seoIntro: string | null;
  seoIndexable: boolean;
  sitemapPriority: number | null;
  sitemapChangefreq: string | null;
  canonicalPath: string | null;
  internalNote: string | null;
};

export type TaxonomyImportPreviewResult = {
  rows: TaxonomyImportParsedRow[];
  issues: TaxonomyImportValidationIssue[];
  canImport: boolean;
  errorCount: number;
  warningCount: number;
};

export type TaxonomyImportExecuteResult = {
  ok: boolean;
  jobId: string | null;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  disabled: number;
  warnings: TaxonomyImportValidationIssue[];
  issues: TaxonomyImportValidationIssue[];
  errorReportCsv: string | null;
  error: string | null;
};

export type TaxonomyImportExportJobRow = {
  id: string;
  actorId: string;
  jobType: string;
  direction: TaxonomyImportExportDirection;
  mode: string | null;
  status: TaxonomyImportExportJobStatus;
  fileName: string | null;
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  failedRows: number;
  errorSummary: Record<string, unknown>;
  createdAt: string;
  completedAt: string | null;
  actorDisplayName: string | null;
};
