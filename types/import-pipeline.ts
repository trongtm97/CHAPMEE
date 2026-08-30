export const IMPORT_JOB_SOURCE_TYPES = [
  "manual_upload",
  "local_file",
  "api",
  "other"
] as const;

export type ImportJobSourceType = (typeof IMPORT_JOB_SOURCE_TYPES)[number];

export const IMPORT_JOB_STATUSES = [
  "uploaded",
  "parsing",
  "parsed",
  "failed",
  "publishing",
  "published",
  "cancelled"
] as const;

export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

export const IMPORT_ITEM_TYPES = ["story", "chapter"] as const;

export type ImportItemType = (typeof IMPORT_ITEM_TYPES)[number];

export const IMPORT_ITEM_STATUSES = [
  "parsed",
  "duplicate",
  "ready",
  "skipped",
  "failed",
  "published"
] as const;

export type ImportItemStatus = (typeof IMPORT_ITEM_STATUSES)[number];

export type ImportJobRow = {
  id: string;
  source_name: string | null;
  source_type: ImportJobSourceType;
  raw_bucket: string;
  raw_object_key: string;
  original_filename: string | null;
  status: ImportJobStatus;
  total_items: number;
  success_count: number;
  failed_count: number;
  duplicate_count: number;
  error_message: string | null;
  created_by_profile_id: string | null;
  owner_profile_id: string | null;
  rights_attested_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type ImportItemRow = {
  id: string;
  import_job_id: string;
  item_type: ImportItemType;
  parent_item_id: string | null;
  source_story_key: string | null;
  source_chapter_key: string | null;
  title: string;
  chapter_title: string | null;
  chapter_number: number | null;
  raw_text_preview: string | null;
  parsed_content_object_key: string | null;
  content_hash: string | null;
  status: ImportItemStatus;
  target_story_id: string | null;
  target_chapter_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export const IMPORT_RAW_PREVIEW_MAX_CHARS = 500;

export const IMPORT_CLEANUP_POLICY = {
  rawFailedRetentionDays: 30,
  processedTempRetentionDays: 14,
  importLogsRetentionDays: 90,
  publishedContentRetention: "permanent" as const
} as const;
