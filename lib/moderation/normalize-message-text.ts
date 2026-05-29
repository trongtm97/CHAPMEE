/** Chuẩn hóa nội dung để so khớp duplicate / keyword. */
export function normalizeMessageText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
