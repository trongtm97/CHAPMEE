export const BULK_IMPORT_MAX_CHAPTERS = 500;
export const BULK_IMPORT_MAX_BYTES = 100 * 1024 * 1024;
export const BULK_IMPORT_MAX_FILE_BYTES = 100 * 1024 * 1024;
export const BULK_IMPORT_TITLE_MAX = 120;
export const BULK_IMPORT_CONTENT_MIN_WARN = 50;

export type ParsedImportChapter = {
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
};

export type ImportChapterPreviewStatus =
  | "valid"
  | "missing_content"
  | "duplicate_in_file"
  | "duplicate_in_story"
  | "title_too_long"
  | "content_short";

export type ImportChapterPreview = ParsedImportChapter & {
  id: string;
  selected: boolean;
  status: ImportChapterPreviewStatus;
  warnings: string[];
  previewLines: string;
};

export type BulkImportParseResult = {
  chapters: ParsedImportChapter[];
  parseErrors: string[];
};

export type BulkImportImportResult = {
  ok: boolean;
  error?: string;
  importedCount: number;
  skippedCount: number;
  errors: Array<{ chapterNumber: number; message: string }>;
};
