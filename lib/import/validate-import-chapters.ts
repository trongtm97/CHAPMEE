import {
  BULK_IMPORT_CONTENT_MIN_WARN,
  BULK_IMPORT_MAX_BYTES,
  BULK_IMPORT_MAX_CHAPTERS,
  BULK_IMPORT_TITLE_MAX,
  type ImportChapterPreview,
  type ImportChapterPreviewStatus,
  type ParsedImportChapter
} from "@/types/import";

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

export function buildImportChapterPreviews(
  chapters: ParsedImportChapter[],
  existingEpisodeNumbers: number[]
): ImportChapterPreview[] {
  const existingSet = new Set(existingEpisodeNumbers);
  const numberCounts = new Map<number, number>();

  for (const chapter of chapters) {
    numberCounts.set(
      chapter.chapterNumber,
      (numberCounts.get(chapter.chapterNumber) ?? 0) + 1
    );
  }

  return chapters.map((chapter, index) => {
    const warnings: string[] = [];
    const statuses: ImportChapterPreviewStatus[] = [];

    if (!chapter.content.trim()) {
      statuses.push("missing_content");
      warnings.push("Thiếu nội dung.");
    }

    if ((numberCounts.get(chapter.chapterNumber) ?? 0) > 1) {
      statuses.push("duplicate_in_file");
      warnings.push("Trùng số chương trong file.");
    }

    if (existingSet.has(chapter.chapterNumber)) {
      statuses.push("duplicate_in_story");
      warnings.push(`Chương ${chapter.chapterNumber} đã tồn tại trong truyện này.`);
    }

    if (chapter.title.length > BULK_IMPORT_TITLE_MAX) {
      statuses.push("title_too_long");
      warnings.push(`Tiêu đề quá dài (tối đa ${BULK_IMPORT_TITLE_MAX} ký tự).`);
    }

    if (
      chapter.content.trim().length > 0 &&
      chapter.content.trim().length < BULK_IMPORT_CONTENT_MIN_WARN
    ) {
      statuses.push("content_short");
      warnings.push("Nội dung khá ngắn — nên kiểm tra lại.");
    }

    const status: ImportChapterPreviewStatus =
      statuses.find((item) =>
        ["missing_content", "duplicate_in_file", "duplicate_in_story", "title_too_long"].includes(
          item
        )
      ) ??
      statuses[0] ??
      "valid";

    const blocked = [
      "missing_content",
      "duplicate_in_file",
      "duplicate_in_story",
      "title_too_long"
    ].includes(status);

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

export function validatePreviewForImport(previews: ImportChapterPreview[]) {
  const selected = previews.filter((item) => item.selected);

  if (selected.length === 0) {
    return { error: "Chọn ít nhất một chương hợp lệ để nhập.", ok: false as const };
  }

  const blocked = selected.filter((item) =>
    ["missing_content", "duplicate_in_file", "duplicate_in_story", "title_too_long"].includes(
      item.status
    )
  );

  if (blocked.length > 0) {
    return {
      error: "Có chương không hợp lệ trong danh sách đã chọn.",
      ok: false as const
    };
  }

  const numbers = selected.map((item) => item.chapterNumber);
  const unique = new Set(numbers);

  if (unique.size !== numbers.length) {
    return { error: "Số chương bị trùng trong danh sách nhập.", ok: false as const };
  }

  if (selected.length > BULK_IMPORT_MAX_CHAPTERS) {
    return {
      error: `Tối đa ${BULK_IMPORT_MAX_CHAPTERS} chương mỗi lần nhập.`,
      ok: false as const
    };
  }

  return { ok: true as const, selected };
}
