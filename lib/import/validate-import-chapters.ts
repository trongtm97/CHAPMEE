import {
  BULK_IMPORT_CONTENT_MIN_WARN,
  BULK_IMPORT_MAX_BYTES,
  BULK_IMPORT_MAX_CHAPTERS,
  BULK_IMPORT_TITLE_MAX,
  type ImportChapterPreview,
  type ImportChapterPreviewStatus,
  type ParsedImportChapter
} from "@/types/import";

const BLOCKING_STATUSES: ImportChapterPreviewStatus[] = [
  "duplicate_in_file",
  "duplicate_in_story"
];

function previewLines(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join("\n");
}

export function validateImportInputSize(inputText: string) {
  const bytes = new TextEncoder().encode(inputText).byteLength;

  if (bytes > BULK_IMPORT_MAX_BYTES) {
    const maxMb = BULK_IMPORT_MAX_BYTES / (1024 * 1024);

    return {
      error: `Nội dung vượt quá ${maxMb}MB. Hãy chia thành nhiều lần nhập.`,
      ok: false as const
    };
  }

  return { ok: true as const };
}

/** Chuẩn hóa từng trường — bỏ qua giá trị lỗi, giữ phần có thể nhập. */
export function normalizeChapterForImport(chapter: {
  chapterNumber: number;
  title: string;
  content: string;
}) {
  const fieldWarnings: string[] = [];
  let title = chapter.title.trim();
  const content = chapter.content;

  if (!title) {
    title = `Chương ${chapter.chapterNumber}`;
    fieldWarnings.push("Thiếu tiêu đề — dùng tên mặc định.");
  }

  if (title.length > BULK_IMPORT_TITLE_MAX) {
    fieldWarnings.push(
      `Tiêu đề quá dài — đã cắt còn ${BULK_IMPORT_TITLE_MAX} ký tự.`
    );
    title = title.slice(0, BULK_IMPORT_TITLE_MAX);
  }

  if (!content.trim()) {
    fieldWarnings.push("Chưa có nội dung — lưu nháp để bạn bổ sung sau.");
  } else if (content.trim().length < BULK_IMPORT_CONTENT_MIN_WARN) {
    fieldWarnings.push("Nội dung khá ngắn — nên kiểm tra lại sau khi nhập.");
  }

  return {
    chapterNumber: chapter.chapterNumber,
    content,
    fieldWarnings,
    title
  };
}

export function buildImportChapterPreviews(
  chapters: ParsedImportChapter[],
  existingEpisodeNumbers: number[]
): ImportChapterPreview[] {
  const existingSet = new Set(existingEpisodeNumbers);
  const numberCounts = new Map<number, number>();
  const firstIndexByNumber = new Map<number, number>();

  for (const chapter of chapters) {
    numberCounts.set(
      chapter.chapterNumber,
      (numberCounts.get(chapter.chapterNumber) ?? 0) + 1
    );
  }

  chapters.forEach((chapter, index) => {
    if (!firstIndexByNumber.has(chapter.chapterNumber)) {
      firstIndexByNumber.set(chapter.chapterNumber, index);
    }
  });

  return chapters.map((chapter, index) => {
    const warnings: string[] = [];
    const statuses: ImportChapterPreviewStatus[] = [];

    if (!chapter.content.trim()) {
      statuses.push("missing_content");
      warnings.push("Chưa có nội dung — vẫn có thể nhập nháp để bổ sung sau.");
    }

    if ((numberCounts.get(chapter.chapterNumber) ?? 0) > 1) {
      if (firstIndexByNumber.get(chapter.chapterNumber) !== index) {
        statuses.push("duplicate_in_file");
        warnings.push("Trùng số chương trong file — bỏ qua bản này, giữ bản đầu.");
      } else {
        warnings.push("Có chương trùng số trong file — chỉ nhập bản đầu tiên.");
      }
    }

    if (existingSet.has(chapter.chapterNumber)) {
      statuses.push("duplicate_in_story");
      warnings.push(`Chương ${chapter.chapterNumber} đã tồn tại — bỏ qua.`);
    }

    if (chapter.title.length > BULK_IMPORT_TITLE_MAX) {
      statuses.push("title_too_long");
      warnings.push(
        `Tiêu đề quá dài — sẽ tự cắt còn ${BULK_IMPORT_TITLE_MAX} ký tự khi nhập.`
      );
    }

    if (
      chapter.content.trim().length > 0 &&
      chapter.content.trim().length < BULK_IMPORT_CONTENT_MIN_WARN
    ) {
      statuses.push("content_short");
      warnings.push("Nội dung khá ngắn — vẫn nhập được, nên kiểm tra lại.");
    }

    const status: ImportChapterPreviewStatus =
      statuses.find((item) => BLOCKING_STATUSES.includes(item)) ??
      statuses[0] ??
      "valid";

    const blocked = BLOCKING_STATUSES.includes(status);

    return {
      ...chapter,
      id: `import-${index}-${chapter.chapterNumber}`,
      previewLines: previewLines(chapter.content),
      selected: !blocked,
      status,
      warnings
    };
  });
}

export function prepareChaptersForImport(previews: ImportChapterPreview[]) {
  const selected = previews.filter((item) => item.selected);
  const importable = selected.filter(
    (item) => !BLOCKING_STATUSES.includes(item.status)
  );
  const skippedBlocked = selected.length - importable.length;

  if (importable.length === 0) {
    return {
      error:
        selected.length === 0
          ? "Chọn ít nhất một chương để nhập."
          : "Các chương đã chọn đều bị trùng hoặc không thể nhập.",
      ok: false as const
    };
  }

  const normalized = importable.map((chapter) => {
    const next = normalizeChapterForImport(chapter);

    return {
      ...chapter,
      content: next.content,
      title: next.title,
      warnings: [...chapter.warnings, ...next.fieldWarnings]
    };
  });

  const numbers = normalized.map((item) => item.chapterNumber);
  const unique = new Set(numbers);

  if (unique.size !== numbers.length) {
    return {
      error: "Số chương bị trùng trong danh sách nhập.",
      ok: false as const
    };
  }

  if (normalized.length > BULK_IMPORT_MAX_CHAPTERS) {
    return {
      error: `Tối đa ${BULK_IMPORT_MAX_CHAPTERS} chương mỗi lần nhập.`,
      ok: false as const
    };
  }

  return {
    ok: true as const,
    selected: normalized,
    skippedBlocked
  };
}

/** @deprecated Dùng prepareChaptersForImport */
export function validatePreviewForImport(previews: ImportChapterPreview[]) {
  return prepareChaptersForImport(previews);
}
