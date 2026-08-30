import { createHash } from "node:crypto";
import { countWords } from "@/lib/text/countWords";
import { createExcerpt } from "@/lib/text/createExcerpt";

export type ParsedImportStory = {
  title: string;
  author?: string | null;
  metadata?: Record<string, unknown>;
};

export type ParsedImportChapter = {
  chapterNumber: number;
  title: string;
  content: string;
  excerpt: string;
  wordCount: number;
  contentHash: string;
};

export type ParsedImportFile = {
  story: ParsedImportStory;
  chapters: ParsedImportChapter[];
  format: "json" | "markdown" | "text";
};

export type ParseImportFileResult =
  | { ok: true; data: ParsedImportFile }
  | { ok: false; error: string };

const CHAPTER_HEADING_RE =
  /^(?:#{1,2}\s*)?(?:chương|chuong|chapter)\s*(\d+)\s*[:：\-–]?\s*(.*)$/i;

export function parseImportFile(
  rawText: string,
  filename: string
): ParseImportFileResult {
  const trimmed = rawText.replace(/^\uFEFF/, "").trim();
  if (!trimmed) {
    return { ok: false, error: "File trống." };
  }

  const lowerName = filename.toLowerCase();
  if (lowerName.endsWith(".json") || trimmed.startsWith("{")) {
    return parseJsonImport(trimmed, filename);
  }

  return parseTextImport(trimmed, filename);
}

function parseJsonImport(raw: string, filename: string): ParseImportFileResult {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { ok: false, error: "JSON không hợp lệ." };
  }

  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "JSON phải là object." };
  }

  const record = payload as Record<string, unknown>;
  const title =
    typeof record.title === "string" && record.title.trim()
      ? record.title.trim()
      : storyTitleFromFilename(filename);
  const author =
    typeof record.author === "string" ? record.author.trim() || null : null;
  const chaptersRaw = record.chapters;

  if (!Array.isArray(chaptersRaw) || chaptersRaw.length === 0) {
    return { ok: false, error: "JSON cần mảng chapters không rỗng." };
  }

  const chapters: ParsedImportChapter[] = [];
  for (let index = 0; index < chaptersRaw.length; index += 1) {
    const row = chaptersRaw[index];
    if (!row || typeof row !== "object") {
      return { ok: false, error: `Chương #${index + 1} không hợp lệ.` };
    }
    const chapterRecord = row as Record<string, unknown>;
    const content =
      typeof chapterRecord.content === "string" ? chapterRecord.content.trim() : "";
    if (!content) {
      return { ok: false, error: `Chương #${index + 1} thiếu content.` };
    }
    const chapterNumber =
      typeof chapterRecord.number === "number"
        ? chapterRecord.number
        : typeof chapterRecord.chapter_number === "number"
          ? chapterRecord.chapter_number
          : index + 1;
    const chapterTitle =
      typeof chapterRecord.title === "string" && chapterRecord.title.trim()
        ? chapterRecord.title.trim()
        : `Chương ${chapterNumber}`;

    chapters.push(buildChapter(chapterNumber, chapterTitle, content));
  }

  return {
    ok: true,
    data: {
      story: { title, author, metadata: { format: "json" } },
      chapters,
      format: "json"
    }
  };
}

function parseTextImport(raw: string, filename: string): ParseImportFileResult {
  const lines = raw.split(/\r?\n/);
  const segments: Array<{ number: number; title: string; startLine: number }> = [];

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].trim().match(CHAPTER_HEADING_RE);
    if (!match) continue;
    const number = Number.parseInt(match[1], 10);
    if (!Number.isFinite(number) || number < 1) continue;
    const titlePart = match[2]?.trim() || `Chương ${number}`;
    segments.push({ number, title: titlePart, startLine: i });
  }

  if (segments.length === 0) {
    return {
      ok: false,
      error:
        "Không tìm thấy tiêu đề chương (Chương 1:, Chapter 1:, # Chương 1). Dùng JSON nếu file không có heading."
    };
  }

  const chapters: ParsedImportChapter[] = [];
  for (let s = 0; s < segments.length; s += 1) {
    const current = segments[s];
    const next = segments[s + 1];
    const bodyLines = lines.slice(
      current.startLine + 1,
      next ? next.startLine : lines.length
    );
    const content = bodyLines.join("\n").trim();
    if (!content) {
      return {
        ok: false,
        error: `Chương ${current.number} không có nội dung sau heading.`
      };
    }
    chapters.push(buildChapter(current.number, current.title, content));
  }

  const storyTitle = inferStoryTitleFromPreamble(lines, segments[0].startLine, filename);

  return {
    ok: true,
    data: {
      story: { title: storyTitle, metadata: { format: "text" } },
      chapters,
      format: filename.toLowerCase().endsWith(".md") ? "markdown" : "text"
    }
  };
}

function inferStoryTitleFromPreamble(
  lines: string[],
  firstChapterLine: number,
  filename: string
) {
  const preamble = lines
    .slice(0, firstChapterLine)
    .map((line) => line.trim())
    .filter(Boolean);

  const titleLine = preamble.find((line) => !line.startsWith("#"));
  if (titleLine) {
    return titleLine.replace(/^#+\s*/, "").slice(0, 200);
  }

  return storyTitleFromFilename(filename);
}

function storyTitleFromFilename(filename: string) {
  const base = filename.split(/[/\\]/).pop() ?? "import";
  return base.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Truyện import";
}

function buildChapter(
  chapterNumber: number,
  title: string,
  content: string
): ParsedImportChapter {
  return {
    chapterNumber,
    title,
    content,
    excerpt: createExcerpt(content, 40, 80),
    wordCount: countWords(content),
    contentHash: hashText(content)
  };
}

function hashText(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
