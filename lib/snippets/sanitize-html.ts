import { sanitizeHtmlContent } from "@/lib/editor/sanitize-content";

/** Sanitize admin safe_html snippets before client render. */
export function sanitizeSnippetHtml(html: string) {
  let output = sanitizeHtmlContent(html);
  output = output.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
  output = output.replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, "");
  output = output.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  output = output.replace(/\s+on\w+\s*=\s*(['"]).*?\1/gi, "");
  output = output.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, "");
  return output.trim();
}
