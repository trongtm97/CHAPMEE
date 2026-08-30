import {
  MOJIBAKE_PATTERNS,
  REPLACEMENT_CHAR,
  VIETNAMESE_QMARK_CORRUPTION_PATTERNS
} from "@/lib/encoding/patterns";

export type EncodingIssueKind = "mojibake" | "replacement_char" | "question_mark_loss";

export type EncodingIssueHit = {
  kind: EncodingIssueKind;
  pattern: string;
  count: number;
};

export type EncodingScanResult = {
  hasIssues: boolean;
  hits: EncodingIssueHit[];
};

export function scanTextForEncodingIssues(text: string): EncodingScanResult {
  const hits: EncodingIssueHit[] = [];

  for (const pattern of MOJIBAKE_PATTERNS) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const re = new RegExp(pattern.source, flags);
    const matches = text.match(re);
    if (matches?.length) {
      hits.push({
        kind: "mojibake",
        pattern: pattern.source,
        count: matches.length
      });
    }
  }

  const replacementCount = (text.match(/\uFFFD/g) ?? []).length;
  if (replacementCount > 0) {
    hits.push({
      kind: "replacement_char",
      pattern: "U+FFFD",
      count: replacementCount
    });
  }

  for (const pattern of VIETNAMESE_QMARK_CORRUPTION_PATTERNS) {
    const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
    const re = new RegExp(pattern.source, flags);
    const matches = text.match(re);
    if (matches?.length) {
      hits.push({
        kind: "question_mark_loss",
        pattern: pattern.source,
        count: matches.length
      });
    }
  }

  return { hasIssues: hits.length > 0, hits };
}

export function formatEncodingWarning(sample: string, maxLen = 120): string {
  const trimmed = sample.trim().slice(0, maxLen);
  return `Nội dung có thể bị lỗi encoding (UTF-8). Kiểm tra file nguồn trước khi lưu. Ví dụ: "${trimmed}${sample.length > maxLen ? "…" : ""}"`;
}

export function assertNoEncodingIssuesInImportText(
  text: string,
  context: string
): { ok: true } | { ok: false; error: string } {
  const scan = scanTextForEncodingIssues(text);
  if (!scan.hasIssues) {
    return { ok: true };
  }
  const kinds = scan.hits.map((h) => h.kind).join(", ");
  return {
    ok: false,
    error: `${context}: phát hiện dấu hiệu encoding lỗi (${kinds}). ${formatEncodingWarning(text)}`
  };
}
