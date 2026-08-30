import {
  isSuspiciousMojibake,
  repairCommonVietnameseMojibake
} from "@/lib/encoding/mojibake-repair";

/** Repair mojibake in already-decoded import text without touching valid Vietnamese. */
export function sanitizeImportText(text: string): string {
  if (!text) return "";
  if (!isSuspiciousMojibake(text)) {
    return text;
  }

  const repaired = repairCommonVietnameseMojibake(text);
  return isSuspiciousMojibake(repaired) ? text : repaired;
}
