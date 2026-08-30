import { scanTextForEncodingIssues } from "@/lib/encoding/detect-encoding-issues";
import { REPLACEMENT_CHAR } from "@/lib/encoding/patterns";
import { shouldRepairField as shouldRepairFieldFromWhitelist } from "@/lib/encoding/db-text-fields";

/** Extra mojibake hints (UTF-8 misread as Latin-1). */
const EXTRA_SUSPICIOUS = [
  /\u00C6/,
  /\u00D1/,
  /\u00EF\u00BF\u00BD/,
  /\uFFFD/
] as const;

const VIETNAMESE_DIACRITIC =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀ-ỹ]/;

export type RepairConfidence = "high" | "medium" | "low" | "none";

export type MojibakeRepairPreview = {
  original: string;
  repaired: string;
  confidence: RepairConfidence;
  score: number;
  reasons: string[];
};

export function containsReplacementChar(text: string): boolean {
  return text.includes(REPLACEMENT_CHAR) || text.includes("\uFFFD");
}

export function isSuspiciousMojibake(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const scan = scanTextForEncodingIssues(text);
  if (scan.hits.some((h) => h.kind === "mojibake")) return true;
  return EXTRA_SUSPICIOUS.some((re) => re.test(text));
}

function latin1StringToUtf8(text: string): string {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index) & 0xff;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * Fix common case: UTF-8 bytes were interpreted as Latin-1 / Windows-1252 and stored as UTF-8 again.
 * Only call when {@link isSuspiciousMojibake} is true.
 */
export function repairCommonVietnameseMojibake(text: string): string {
  if (!text) return text;

  let current = text;
  for (let pass = 0; pass < 2; pass++) {
    if (!isSuspiciousMojibake(current)) break;
    let next: string;
    try {
      next = latin1StringToUtf8(current);
    } catch {
      break;
    }
    if (!next || next === current) break;
    current = next;
  }
  return current;
}

export function calculateRepairConfidence(
  original: string,
  repaired: string
): { confidence: RepairConfidence; score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (!original?.trim()) {
    return { confidence: "none", score: 0, reasons: ["empty"] };
  }
  if (original === repaired) {
    return { confidence: "none", score: 0, reasons: ["unchanged"] };
  }
  if (!isSuspiciousMojibake(original)) {
    return { confidence: "none", score: 0, reasons: ["original_not_suspicious"] };
  }

  score += 0.35;
  reasons.push("original_suspicious");

  if (isSuspiciousMojibake(repaired)) {
    score -= 0.35;
    reasons.push("repaired_still_suspicious");
  } else {
    score += 0.3;
    reasons.push("repaired_clean");
  }

  if (containsReplacementChar(original)) {
    score -= 0.45;
    reasons.push("original_has_replacement_char");
  }

  const charRatio = repaired.length / Math.max(original.length, 1);
  const byteRatio =
    utf8ByteLength(repaired) / Math.max(utf8ByteLength(original), 1);
  const lenRatio = Math.max(charRatio, byteRatio);

  if (lenRatio < 0.6 && isSuspiciousMojibake(repaired)) {
    score -= 0.35;
    reasons.push("length_shrink_suspicious");
  } else if (lenRatio < 0.5) {
    score -= 0.2;
    reasons.push("length_shrink");
  } else if (lenRatio > 1.5) {
    score -= 0.15;
    reasons.push("length_growth");
  } else {
    score += 0.15;
    reasons.push("length_ok");
  }

  if (VIETNAMESE_DIACRITIC.test(repaired)) {
    score += 0.2;
    reasons.push("repaired_has_vietnamese");
  }

  score = Math.max(0, Math.min(1, score));

  let confidence: RepairConfidence = "low";
  if (score >= 0.75) confidence = "high";
  else if (score >= 0.55) confidence = "medium";

  if (containsReplacementChar(original) && confidence === "high") {
    confidence = "medium";
    reasons.push("capped_due_to_replacement_char");
  }

  return { confidence, score, reasons };
}

export function previewMojibakeRepair(text: string): MojibakeRepairPreview {
  const repaired = isSuspiciousMojibake(text)
    ? repairCommonVietnameseMojibake(text)
    : text;
  const { confidence, score, reasons } = calculateRepairConfidence(text, repaired);
  return { original: text, repaired, confidence, score, reasons };
}

export function shouldRepairField(table: string, field: string): boolean {
  return shouldRepairFieldFromWhitelist(table, field);
}

export function isHighConfidenceRepair(preview: MojibakeRepairPreview): boolean {
  return (
    preview.confidence === "high" &&
    !isSuspiciousMojibake(preview.repaired) &&
    preview.original !== preview.repaired
  );
}

export function excerpt(text: string, max = 120): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
}
