import { normalizeHeader } from "@/lib/studio/csv";
import type { StudioDisplayStatus } from "@/types/studio";
import type {
  ImportExportAction,
  ImportExportDataType,
  ImportExportHeader,
  ImportExportRow,
  ImportPreviewResult,
  ImportPreviewRow,
  ImportPreviewStats,
  ImportRowStatus
} from "@/types/studio-import";
import { IMPORT_EXPORT_HEADERS } from "@/types/studio-import";

export const VALID_IMPORT_ACTIONS: ImportExportAction[] = [
  "create",
  "update",
  "hide",
  "delete",
  "schedule"
];

export const VALID_STORY_STATUSES: StudioDisplayStatus[] = [
  "draft",
  "scheduled",
  "published",
  "completed",
  "hidden",
  "rejected",
  "under_review",
  "paused"
];

export const VALID_CHAPTER_STATUSES: StudioDisplayStatus[] = [
  "draft",
  "scheduled",
  "published",
  "hidden",
  "rejected",
  "under_review"
];

export const VALID_REEL_STATUSES = ["draft", "scheduled", "published", "hidden", "rejected"] as const;

const EMPTY_ROW = (): ImportExportRow =>
  Object.fromEntries(IMPORT_EXPORT_HEADERS.map((header) => [header, ""])) as ImportExportRow;

export function rowsFromParsedCsv(
  headers: string[],
  rows: string[][]
): { rows: ImportExportRow[]; headerError: string | null } {
  const normalizedHeaders = headers.map(normalizeHeader);
  const missingRequired = IMPORT_EXPORT_HEADERS.filter(
    (required) => !normalizedHeaders.includes(required)
  );

  if (normalizedHeaders.length === 0) {
    return { headerError: "File không có dòng header.", rows: [] };
  }

  if (missingRequired.length === IMPORT_EXPORT_HEADERS.length) {
    return {
      headerError: `Header không hợp lệ. Cần ít nhất một cột trong: ${IMPORT_EXPORT_HEADERS.join(", ")}.`,
      rows: []
    };
  }

  const indexMap = new Map<string, number>();
  normalizedHeaders.forEach((header, index) => {
    if (!indexMap.has(header)) {
      indexMap.set(header, index);
    }
  });

  const mappedRows: ImportExportRow[] = [];

  for (const rawRow of rows) {
    const isEmpty = rawRow.every((cell) => cell.trim().length === 0);
    if (isEmpty) {
      continue;
    }

    const row = EMPTY_ROW();
    for (const header of IMPORT_EXPORT_HEADERS) {
      const index = indexMap.get(header);
      row[header] = index === undefined ? "" : String(rawRow[index] ?? "").trim();
    }
    mappedRows.push(row);
  }

  return { headerError: null, rows: mappedRows };
}

export function mapRowToAction(row: ImportExportRow, importType: ImportExportDataType): ImportExportAction {
  const explicit = row.action.trim().toLowerCase() as ImportExportAction;
  if (VALID_IMPORT_ACTIONS.includes(explicit)) {
    return explicit;
  }

  const hasStoryId = Boolean(row.story_id);
  const hasChapterId = Boolean(row.chapter_id);
  const hasReelId = Boolean(row.reel_id);

  if (importType === "stories" || (importType === "all" && !row.chapter_id && !row.reel_id)) {
    return hasStoryId ? "update" : "create";
  }

  if (importType === "chapters" || importType === "stories_chapters" || importType === "all") {
    if (hasChapterId || (hasStoryId && row.chapter_number)) {
      return "update";
    }
    return "create";
  }

  if (importType === "reels" || importType === "all") {
    return hasReelId ? "update" : "create";
  }

  return "create";
}

function isValidIsoDate(value: string): boolean {
  if (!value.trim()) {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function pushMessage(messages: string[], message: string, status: ImportRowStatus): ImportRowStatus {
  messages.push(message);
  if (status === "error") {
    return "error";
  }
  return message.includes("Cảnh báo") ? "warning" : "warning";
}

function validateRowForType(
  row: ImportExportRow,
  importType: ImportExportDataType,
  action: ImportExportAction
): { status: ImportRowStatus; messages: string[] } {
  const messages: string[] = [];
  let status: ImportRowStatus = "valid";

  if (row.action && !VALID_IMPORT_ACTIONS.includes(row.action.trim().toLowerCase() as ImportExportAction)) {
    status = pushMessage(
      messages,
      `action không hợp lệ: "${row.action}". Chỉ chấp nhận create/update/hide/delete/schedule.`,
      "error"
    );
  }

  const touchesStory =
    importType === "stories" ||
    importType === "stories_chapters" ||
    importType === "all" ||
    Boolean(row.story_id || row.story_title);

  const touchesChapter =
    importType === "chapters" ||
    importType === "stories_chapters" ||
    importType === "all" ||
    Boolean(row.chapter_id || row.chapter_number || row.chapter_title || row.chapter_content);

  const touchesReel =
    importType === "reels" ||
    importType === "all" ||
    Boolean(row.reel_id || row.reel_title || row.reel_text);

  if (touchesStory && row.story_status && !VALID_STORY_STATUSES.includes(row.story_status as StudioDisplayStatus)) {
    status = pushMessage(messages, `story_status không hợp lệ: "${row.story_status}".`, "error");
  }

  if (
    touchesChapter &&
    row.chapter_status &&
    !VALID_CHAPTER_STATUSES.includes(row.chapter_status as StudioDisplayStatus)
  ) {
    status = pushMessage(messages, `chapter_status không hợp lệ: "${row.chapter_status}".`, "error");
  }

  if (touchesReel && row.reel_status && !VALID_REEL_STATUSES.includes(row.reel_status as (typeof VALID_REEL_STATUSES)[number])) {
    status = pushMessage(messages, `reel_status không hợp lệ: "${row.reel_status}".`, "error");
  }

  if (row.chapter_number && !/^\d+$/.test(row.chapter_number)) {
    status = pushMessage(messages, "chapter_number phải là số nguyên dương.", "error");
  }

  if (action === "create") {
    if ((importType === "stories" || importType === "all") && touchesStory && !row.story_id && !row.story_title) {
      status = pushMessage(messages, "Tạo truyện cần story_title.", "error");
    }

    if (touchesChapter && !row.chapter_id) {
      if (!row.story_id && !row.story_title) {
        status = pushMessage(messages, "Tạo chương cần story_id hoặc story_title.", "error");
      }
      if (!row.chapter_title && !row.chapter_content) {
        status = pushMessage(messages, "Tạo chương cần chapter_title hoặc chapter_content.", "error");
      }
    }

    if (touchesReel && !row.reel_id && !row.reel_text && !row.reel_title) {
      status = pushMessage(messages, "Tạo Reels cần reel_title hoặc reel_text.", "error");
    }
  }

  if (action === "update") {
    if (touchesStory && !row.story_id && !row.story_title) {
      status = pushMessage(messages, "Cập nhật truyện cần story_id.", "error");
    }
    if (touchesChapter && !row.chapter_id && !(row.story_id && row.chapter_number)) {
      status = pushMessage(
        messages,
        "Cập nhật chương cần chapter_id hoặc story_id + chapter_number.",
        "error"
      );
    }
    if (touchesReel && !row.reel_id) {
      status = pushMessage(messages, "Cập nhật Reels cần reel_id.", "error");
    }
  }

  if ((action === "hide" || action === "delete") && !row.story_id && !row.chapter_id && !row.reel_id) {
    status = pushMessage(messages, `${action} cần id tương ứng (story/chapter/reel).`, "error");
  }

  if (action === "schedule") {
    if (!isValidIsoDate(row.scheduled_at)) {
      status = pushMessage(
        messages,
        "action=schedule cần scheduled_at đúng định dạng ISO datetime.",
        "error"
      );
    }
  }

  if (action === "create" && row.story_id) {
    status = pushMessage(
      messages,
      "Cảnh báo: có story_id nhưng action=create — sẽ bỏ qua story_id và tạo mới.",
      status === "error" ? "error" : "warning"
    );
  }

  return { messages, status };
}

export function buildImportPreview(
  rows: ImportExportRow[],
  importType: ImportExportDataType
): ImportPreviewResult {
  const previewRows: ImportPreviewRow[] = rows.map((row, index) => {
    const inferredAction = mapRowToAction(row, importType);
    const validation = validateRowForType(row, importType, inferredAction);

    return {
      data: row,
      inferredAction,
      messages: validation.messages,
      rowIndex: index + 2,
      status: validation.status
    };
  });

  const stats: ImportPreviewStats = {
    create: previewRows.filter((row) => row.inferredAction === "create" && row.status !== "error").length,
    error: previewRows.filter((row) => row.status === "error").length,
    skip: previewRows.filter((row) => row.inferredAction === "update" && row.status === "warning").length,
    total: previewRows.length,
    update: previewRows.filter((row) => row.inferredAction === "update" && row.status !== "error").length,
    warning: previewRows.filter((row) => row.status === "warning").length
  };

  return {
    headerError: null,
    rows: previewRows,
    stats
  };
}

export function validateImportRows(
  headers: string[],
  rawRows: string[][],
  importType: ImportExportDataType
): ImportPreviewResult {
  const parsed = rowsFromParsedCsv(headers, rawRows);

  if (parsed.headerError) {
    return {
      headerError: parsed.headerError,
      rows: [],
      stats: { create: 0, error: 0, skip: 0, total: 0, update: 0, warning: 0 }
    };
  }

  if (parsed.rows.length === 0) {
    return {
      headerError: "Không có dòng dữ liệu hợp lệ.",
      rows: [],
      stats: { create: 0, error: 0, skip: 0, total: 0, update: 0, warning: 0 }
    };
  }

  return buildImportPreview(parsed.rows, importType);
}

export function getEmptyTemplateRows(importType: ImportExportDataType): ImportExportRow[] {
  const sample = EMPTY_ROW();

  if (importType === "stories") {
    return [
      { ...sample, story_title: "Tên truyện mẫu", story_status: "draft", story_genre: "<main_genre_slug>", action: "create" }
    ];
  }

  if (importType === "chapters") {
    return [
      {
        ...sample,
        story_title: "Tên truyện",
        chapter_number: "1",
        chapter_title: "Chương 1",
        chapter_content: "Nội dung chương...",
        chapter_status: "draft",
        action: "create"
      }
    ];
  }

  if (importType === "reels") {
    return [
      {
        ...sample,
        story_title: "Tên truyện",
        reel_title: "Hook Reels",
        reel_text: "Nội dung Reels ngắn...",
        reel_status: "draft",
        action: "create"
      }
    ];
  }

  return [
    {
      ...sample,
      story_title: "Tên truyện",
      story_status: "draft",
      chapter_number: "1",
      chapter_title: "Chương 1",
      chapter_content: "Nội dung...",
      action: "create"
    }
  ];
}

export function getHeadersForDataType(dataType: ImportExportDataType): ImportExportHeader[] {
  if (dataType === "stories") {
    return ["story_id", "story_title", "story_status", "story_genre", "action"];
  }
  if (dataType === "chapters") {
    return [
      "story_id",
      "story_title",
      "chapter_id",
      "chapter_number",
      "chapter_title",
      "chapter_status",
      "chapter_content",
      "scheduled_at",
      "action"
    ];
  }
  if (dataType === "reels") {
    return [
      "story_id",
      "story_title",
      "reel_id",
      "reel_title",
      "reel_text",
      "reel_status",
      "scheduled_at",
      "action"
    ];
  }
  return [...IMPORT_EXPORT_HEADERS];
}

export function previewColumnsForType(importType: ImportExportDataType): ImportExportHeader[] {
  const headers = getHeadersForDataType(importType === "stories_chapters" ? "all" : importType);
  return headers.filter((header) => header !== "action").slice(0, 8);
}
