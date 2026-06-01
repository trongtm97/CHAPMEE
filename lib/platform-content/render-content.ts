export function escapePlainTextContent(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function splitPlainTextParagraphs(content: string) {
  return content
    .split("\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
