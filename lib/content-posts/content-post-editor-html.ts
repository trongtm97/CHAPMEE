import {
  renderContentPostToSafeHtml,
  sanitizeContentPostHtmlFragment
} from "@/lib/content-posts/content-post-html";

/** Chuyển nội dung lưu (markdown hoặc HTML) sang HTML an toàn cho vùng soạn WYSIWYG. */
export function contentToEditorHtml(value: string): string {
  if (!value.trim()) {
    return "";
  }
  return renderContentPostToSafeHtml(value);
}

/** Chuẩn hóa HTML từ contentEditable trước khi lưu. */
export function serializeEditorHtml(html: string): string {
  return sanitizeContentPostHtmlFragment(html);
}

export function isLikelyHtmlContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.startsWith("<")) {
    return true;
  }
  return /<(h[2-4]|p|ul|ol|table|blockquote|img|figure|div|a|strong|em|u)\b/i.test(trimmed);
}
