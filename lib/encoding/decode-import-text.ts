import {
  isSuspiciousMojibake,
  repairCommonVietnameseMojibake
} from "@/lib/encoding/mojibake-repair";
import { decodeWindows1258Bytes } from "@/lib/encoding/decode-windows-1258";

const VIETNAMESE_DIACRITIC =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀ-ỹ]/g;

type LegacyEncoding = "latin1" | "windows-1252" | "windows-1258";

function countVietnameseDiacritics(text: string): number {
  return (text.match(VIETNAMESE_DIACRITIC) ?? []).length;
}

function scoreImportText(text: string): number {
  let score = countVietnameseDiacritics(text) * 3;
  if (isSuspiciousMojibake(text)) {
    score -= 40;
  }
  if (text.includes("\uFFFD")) {
    score -= 30;
  }
  return score;
}

function decodeWindows1258(bytes: Uint8Array): string {
  try {
    const decoded = new TextDecoder("windows-1258", { fatal: false }).decode(bytes);
    if (decoded && !decoded.includes("\uFFFD")) {
      return decoded;
    }
  } catch {
    // TextDecoder may not support windows-1258 in some browsers.
  }
  return decodeWindows1258Bytes(bytes);
}

function pickBestCandidate(candidates: string[]): string {
  return candidates.reduce((best, current) =>
    scoreImportText(current) > scoreImportText(best) ? current : best
  );
}

function decodeBytes(bytes: Uint8Array, encoding: string): string {
  if (encoding === "windows-1258") {
    return decodeWindows1258(bytes);
  }
  try {
    return new TextDecoder(encoding, { fatal: false }).decode(bytes);
  } catch {
    return "";
  }
}

function tryStrictUtf8Decode(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function stripUtf8Bom(bytes: Uint8Array): Uint8Array {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    return bytes.subarray(3);
  }
  return bytes;
}

function detectUtf16(bytes: Uint8Array): "utf-16le" | "utf-16be" | null {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return "utf-16le";
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return "utf-16be";
  }
  return null;
}

function finalizeDecodedText(text: string): string {
  if (!text) return text;
  if (!isSuspiciousMojibake(text)) {
    return text;
  }
  const repaired = repairCommonVietnameseMojibake(text);
  return isSuspiciousMojibake(repaired) ? text : repaired;
}

function decodeLegacyCandidates(bytes: Uint8Array): string[] {
  const encodings: LegacyEncoding[] = ["windows-1258", "windows-1252", "latin1"];
  const candidates: string[] = [];

  for (const encoding of encodings) {
    const decoded = decodeBytes(bytes, encoding);
    if (decoded) {
      candidates.push(decoded);
      const repaired = repairCommonVietnameseMojibake(decoded);
      if (repaired !== decoded) {
        candidates.push(repaired);
      }
    }
  }

  return candidates;
}

/**
 * Decode import file bytes — handles UTF-8 BOM, UTF-16 (Excel), Windows-1258/1252/ANSI,
 * and common Vietnamese mojibake from Excel CSV exports.
 */
export function decodeImportTextBytes(buffer: ArrayBuffer | Uint8Array): string {
  const input = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (input.length === 0) {
    return "";
  }

  const utf16 = detectUtf16(input);
  if (utf16) {
    const decoded = decodeBytes(input.subarray(2), utf16);
    return finalizeDecodedText(decoded);
  }

  const utf8Bytes = stripUtf8Bom(input);
  const strictUtf8 = tryStrictUtf8Decode(utf8Bytes);
  if (strictUtf8 != null && !strictUtf8.includes("\uFFFD")) {
    return finalizeDecodedText(strictUtf8);
  }

  const utf8Loose = decodeBytes(utf8Bytes, "utf-8");
  const utf8Repaired = repairCommonVietnameseMojibake(utf8Loose);
  const legacy = decodeLegacyCandidates(utf8Bytes);

  const best = pickBestCandidate([utf8Loose, utf8Repaired, ...legacy]);
  return finalizeDecodedText(best);
}
