import { sanitizeHtmlContent, sanitizePlainContent } from "@/lib/editor/sanitize-content";

const ALLOWED_TAGS = new Set([
  "h2",
  "h3",
  "h4",
  "p",
  "ul",
  "ol",
  "li",
  "a",
  "strong",
  "em",
  "code",
  "pre",
  "br",
  "blockquote"
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "rel", "target"])
};

/** Promote markdown H1 (# ) to H2 — SEO blocks must not emit H1. */
export function normalizeSeoMarkdownHeadings(markdown: string): string {
  return markdown.replace(/^#\s+(?!#)/gm, "## ");
}

export function detectSeoMarkdownH1Warnings(markdown: string): string[] {
  const lines = markdown.split("\n");
  const warnings: string[] = [];
  for (const line of lines) {
    if (/^#\s+(?!#)/.test(line.trim())) {
      warnings.push("Phát hiện H1 (# ) — sẽ tự chuyển thành H2 khi publish.");
      break;
    }
  }
  return warnings;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function sanitizeSeoLinkUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return null;
  }
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function parseInlineMarkdown(text: string): string {
  let output = escapeHtml(text);

  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    const safeUrl = sanitizeSeoLinkUrl(String(url));
    if (!safeUrl) {
      return escapeHtml(String(label));
    }
    return `<a href="${escapeHtml(safeUrl)}" rel="noopener noreferrer">${escapeHtml(String(label))}</a>`;
  });

  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");

  return output;
}

function stripDisallowedHtml(html: string): string {
  return html.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, tagName, attrs) => {
    const tag = String(tagName).toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }

    if (full.startsWith("</")) {
      return `</${tag}>`;
    }

    const allowed = ALLOWED_ATTRS[tag];
    if (!allowed) {
      return `<${tag}>`;
    }

    const safeAttrs: string[] = [];
    const attrRegex = /([a-z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(String(attrs))) !== null) {
      const name = match[1]?.toLowerCase();
      const value = match[3] ?? match[4] ?? match[5] ?? "";
      if (!name || !allowed.has(name)) {
        continue;
      }
      if (name === "href") {
        const safeHref = sanitizeSeoLinkUrl(value);
        if (safeHref) {
          safeAttrs.push(`href="${escapeHtml(safeHref)}"`);
        }
        continue;
      }
      if (name === "rel") {
        safeAttrs.push(`rel="noopener noreferrer"`);
      }
    }

    if (tag === "a" && !safeAttrs.some((a) => a.startsWith("href="))) {
      return "";
    }

    return safeAttrs.length > 0 ? `<${tag} ${safeAttrs.join(" ")}>` : `<${tag}>`;
  });
}

export function renderSeoMarkdownToSafeHtml(markdown: string): string {
  const normalized = normalizeSeoMarkdownHeadings(sanitizePlainContent(markdown));
  const lines = normalized.split("\n");
  const htmlParts: string[] = [];
  let inUl = false;
  let inOl = false;

  function closeLists() {
    if (inUl) {
      htmlParts.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      htmlParts.push("</ol>");
      inOl = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      closeLists();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (headingMatch) {
      closeLists();
      const level = headingMatch[1]!.length;
      const tag = level === 2 ? "h2" : level === 3 ? "h3" : "h4";
      htmlParts.push(`<${tag}>${parseInlineMarkdown(headingMatch[2]!)}</${tag}>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      if (!inUl) {
        closeLists();
        inUl = true;
        htmlParts.push("<ul>");
      }
      htmlParts.push(`<li>${parseInlineMarkdown(trimmed.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (!inOl) {
        closeLists();
        inOl = true;
        htmlParts.push("<ol>");
      }
      htmlParts.push(`<li>${parseInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }

    if (trimmed.startsWith(">")) {
      closeLists();
      htmlParts.push(`<blockquote><p>${parseInlineMarkdown(trimmed.replace(/^>\s?/, ""))}</p></blockquote>`);
      continue;
    }

    closeLists();
    htmlParts.push(`<p>${parseInlineMarkdown(trimmed)}</p>`);
  }

  closeLists();

  const rawHtml = htmlParts.join("");
  return stripDisallowedHtml(sanitizeHtmlContent(rawHtml));
}
