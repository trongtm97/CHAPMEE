import { createHash } from "crypto";

export function hashSelectedText(text: string) {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 32);
}

export function extractPrefixSuffix(
  blockPlainText: string,
  startOffset: number,
  endOffset: number,
  contextLen = 24
) {
  const prefix = blockPlainText.slice(Math.max(0, startOffset - contextLen), startOffset);
  const suffix = blockPlainText.slice(endOffset, endOffset + contextLen);
  return { prefixText: prefix || null, suffixText: suffix || null };
}
