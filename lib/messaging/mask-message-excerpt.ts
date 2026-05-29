export function maskMessageExcerpt(text: string, maxLen = 160): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "(rỗng)";
  }

  const masked = trimmed
    .replace(/https?:\/\/\S+/gi, "[link]")
    .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/gi, "[email]")
    .replace(/\b0\d{8,10}\b/g, "[sđt]");

  if (masked.length <= maxLen) {
    return masked;
  }
  return `${masked.slice(0, maxLen - 1)}…`;
}
