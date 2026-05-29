import { countWords } from "@/lib/text/countWords";
import type { BulkImportParseResult, ParsedImportChapter } from "@/types/import";

const CHAPTER_MARKER =
  /===\s*CHƯƠNG\s+(\d+)\s*===/gi;

function normalizeInput(inputText: string) {
  return inputText.replace(/\r\n/g, "\n").trim();
}

function parseChapterBody(chapterNumber: number, body: string): ParsedImportChapter | null {
  const trimmed = body.trim();

  if (!trimmed) {
    return null;
  }

  let title = "";
  let content = "";

  const titleMatch = trimmed.match(/^Tiêu đề:\s*(.+)$/im);

  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  const contentIndex = trimmed.search(/^Nội dung:\s*/im);

  if (contentIndex >= 0) {
    content = trimmed
      .slice(contentIndex)
      .replace(/^Nội dung:\s*/im, "")
      .trim();
  } else if (titleMatch) {
    content = trimmed.replace(/^Tiêu đề:\s*.+$/im, "").trim();
  } else {
    const lines = trimmed.split("\n");
    title = lines[0]?.trim() || `Chương ${chapterNumber}`;
    content = lines.slice(1).join("\n").trim();
  }

  if (!title) {
    title = `Chương ${chapterNumber}`;
  }

  return {
    chapterNumber,
    content,
    title,
    wordCount: countWords(content)
  };
}

export function parseBulkImportTemplate(inputText: string): BulkImportParseResult {
  const normalized = normalizeInput(inputText);
  const parseErrors: string[] = [];

  if (!normalized) {
    return { chapters: [], parseErrors: ["Chưa có nội dung để đọc."] };
  }

  const chapters: ParsedImportChapter[] = [];
  const matches = [...normalized.matchAll(CHAPTER_MARKER)];

  if (matches.length === 0) {
    return {
      chapters: [],
      parseErrors: [
        "Không tìm thấy chương nào. Mỗi chương phải bắt đầu bằng dòng === CHƯƠNG SỐ ===."
      ]
    };
  }

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const nextMatch = matches[index + 1];
    const chapterNumber = Number.parseInt(match[1], 10);
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = nextMatch?.index ?? normalized.length;
    const body = normalized.slice(bodyStart, bodyEnd);

    if (!Number.isFinite(chapterNumber) || chapterNumber < 1) {
      parseErrors.push(`Số chương không hợp lệ gần vị trí ${bodyStart}.`);
      continue;
    }

    const parsed = parseChapterBody(chapterNumber, body);

    if (!parsed) {
      parseErrors.push(`Chương ${chapterNumber} trống hoặc không đọc được.`);
      continue;
    }

    chapters.push(parsed);
  }

  return { chapters, parseErrors };
}
