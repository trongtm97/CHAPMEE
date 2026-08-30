import type { StudioDisplayStatus } from "@/types/studio";

export type ImportExportDataType =
  | "stories"
  | "chapters"
  | "reels"
  | "stories_chapters"
  | "all";

export type ImportExportFormat = "csv" | "xlsx" | "json";

export type ImportExportAction = "create" | "update" | "hide" | "delete" | "schedule";

export type ExportScopeMode =
  | "all_stories"
  | "selected_stories"
  | "by_status"
  | "by_genre"
  | "by_updated";

export type ImportRowStatus = "valid" | "warning" | "error";

export type ImportExportJobType = "import" | "export";

export type ImportExportJobStatus = "completed" | "partial" | "failed" | "pending";

export const IMPORT_EXPORT_HEADERS = [
  "story_id",
  "story_title",
  "story_status",
  "story_genre",
  "chapter_id",
  "chapter_number",
  "chapter_title",
  "chapter_status",
  "chapter_content",
  "scheduled_at",
  "reel_id",
  "reel_title",
  "reel_text",
  "reel_status",
  "action"
] as const;

export type ImportExportHeader = (typeof IMPORT_EXPORT_HEADERS)[number];

export type ImportExportRow = Record<ImportExportHeader, string>;

export type ImportPreviewRow = {
  rowIndex: number;
  data: ImportExportRow;
  status: ImportRowStatus;
  messages: string[];
  inferredAction: ImportExportAction;
};

export type ImportPreviewStats = {
  total: number;
  create: number;
  update: number;
  skip: number;
  warning: number;
  error: number;
};

export type ImportPreviewResult = {
  rows: ImportPreviewRow[];
  stats: ImportPreviewStats;
  headerError: string | null;
};

export type ImportExecutionResult = {
  ok: boolean;
  created: number;
  updated: number;
  hidden: number;
  deleted: number;
  skipped: number;
  errors: Array<{ rowIndex: number; message: string; row: ImportExportRow }>;
  error?: string;
};

export type ExportScopeInput = {
  mode: ExportScopeMode;
  storyIds?: string[];
  status?: StudioDisplayStatus | "all";
  genreId?: string;
  updatedAfter?: string;
  updatedBefore?: string;
};

export type ImportExportHistoryEntry = {
  id: string;
  createdAt: string;
  jobType: ImportExportJobType;
  dataType: ImportExportDataType;
  fileName: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  status: ImportExportJobStatus;
  performedBy: string;
  /** Base64 or truncated CSV for re-download — optional, client-only mock */
  fileContent?: string;
  errorFileContent?: string;
};

export type StoryQuickPickItem = {
  id: string;
  title: string;
  publicCode: string | null;
  displayStatus: StudioDisplayStatus;
  episodeCount: number;
  structureType: "chaptered" | "standalone";
};

export type ImportExportPageData = {
  stories: StoryQuickPickItem[];
  genres: Array<{ id: string; name: string }>;
  totalStories: number;
  hasExportableData: boolean;
  performerName: string;
};

export type ImportTypeOption = ImportExportDataType | "chapmee_backup";
