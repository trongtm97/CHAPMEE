import { sanitizeHtmlContent, sanitizePlainContent } from "@/lib/editor/sanitize-content";

const ALLOWED_TAGS = new Set([
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "ul",
  "ol",
  "li",
  "a",
  "strong",
  "em",
  "u",
  "b",
  "i",
  "s",
  "del",
  "ins",
  "mark",
  "sub",
  "sup",
  "span",
  "code",
  "pre",
  "br",
  "hr",
  "blockquote",
  "img",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "div"
]);

const ALIGN_CLASSES = new Set([
  "text-left",
  "text-center",
  "text-right",
  "text-justify",
  "post-image",
  "post-align-left",
  "post-align-center",
  "post-align-right"
]);

// Tags allowed to carry a (sanitized) inline style — covers TipTap color, highlight, alignment.
const STYLE_TAGS = new Set([
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "span",
  "mark",
  "li",
  "blockquote",
  "td",
  "th",
  "div",
  "a",
  "strong",
  "em",
  "u",
  "s",
  "sub",
  "sup",
  "code"
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "rel", "target"]),
  img: new Set(["src", "alt", "title"]),
  p: new Set(["class"]),
  div: new Set(["class"]),
  figure: new Set(["class", "data-align"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"])
};

const SAFE_COLOR = /^(#(?:[0-9a-f]{3,8})|rgba?\([\d.,\s%]+\)|hsla?\([\d.,\s%]+\)|[a-z]+)$/i;

/** Keep only color / background-color / text-align declarations with safe values. */
function sanitizeStyleAttribute(value: string): string {
  const safe: string[] = [];
  for (const declaration of value.split(";")) {
    const [rawProp, ...rest] = declaration.split(":");
    if (!rawProp || rest.length === 0) {
      continue;
    }
    const prop = rawProp.trim().toLowerCase();
    const propValue = rest.join(":").trim();
    if (!propValue || /url\(|expression|javascript:/i.test(propValue)) {
      continue;
    }
    if (prop === "color" || prop === "background-color") {
      if (SAFE_COLOR.test(propValue)) {
        safe.push(`${prop}: ${propValue}`);
      }
      continue;
    }
    if (prop === "text-align") {
      if (["left", "center", "right", "justify"].includes(propValue.toLowerCase())) {
        safe.push(`text-align: ${propValue.toLowerCase()}`);
      }
    }
  }
  return safe.join("; ");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function sanitizeContentPostLinkUrl(url: string): string | null {
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

function sanitizeImageUrl(url: string): string | null {
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
  return sanitizeContentPostLinkUrl(trimmed);
}

function sanitizeRelAttribute(value: string): string {
  const tokens = value
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => ["noopener", "noreferrer", "nofollow", "sponsored", "ugc"].includes(token));
  if (!tokens.includes("noopener")) {
    tokens.unshift("noopener");
  }
  return [...new Set(tokens)].join(" ");
}

function parseInlineMarkdown(text: string): string {
  let output = escapeHtml(text);

  output = output.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    const safeUrl = sanitizeImageUrl(String(url));
    if (!safeUrl) {
      return "";
    }
    return `<img src="${escapeHtml(safeUrl)}" alt="${escapeHtml(String(alt))}" />`;
  });

  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    const safeUrl = sanitizeContentPostLinkUrl(String(url));
    if (!safeUrl) {
      return escapeHtml(String(label));
    }
    const external = /^https?:\/\//i.test(safeUrl);
    const rel = external ? ' rel="noopener noreferrer"' : "";
    return `<a href="${escapeHtml(safeUrl)}" class="text-cyan-600 hover:underline"${rel}>${escapeHtml(String(label))}</a>`;
  });

  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  output = output.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  output = output.replace(/_([^_]+)_/g, "<em>$1</em>");
  output = output.replace(/\+\+([^+]+)\+\+/g, "<u>$1</u>");
  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");

  return output;
}

function isMarkdownTableRow(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|");
}

function isMarkdownTableSeparator(line: string) {
  return /^\|?[\s:-]+\|[\s|:-]+\|?$/.test(line.trim());
}

function parseMarkdownTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function sanitizeContentPostHtmlFragment(html: string): string {
  const cleaned = sanitizeHtmlContent(
    html
      .replace(/\r\n/g, "\n")
      .replace(/<!--[\s\S]*?-->/g, "")
  );
  return stripDisallowedHtml(cleaned);
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

    const safeAttrs: string[] = [];
    const attrRegex = /([a-z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(String(attrs))) !== null) {
      const name = match[1]?.toLowerCase();
      const value = match[3] ?? match[4] ?? match[5] ?? "";
      if (!name) {
        continue;
      }
      if (name === "style" && STYLE_TAGS.has(tag)) {
        const safeStyle = sanitizeStyleAttribute(value);
        if (safeStyle) {
          safeAttrs.push(`style="${escapeHtml(safeStyle)}"`);
        }
        continue;
      }
      if (!allowed || !allowed.has(name)) {
        continue;
      }
      if (name === "href") {
        const safeHref = sanitizeContentPostLinkUrl(value);
        if (safeHref) {
          safeAttrs.push(`href="${escapeHtml(safeHref)}"`);
        }
        continue;
      }
      if (name === "src") {
        const safeSrc = sanitizeImageUrl(value);
        if (safeSrc) {
          safeAttrs.push(`src="${escapeHtml(safeSrc)}"`);
        }
        continue;
      }
      if (name === "rel") {
        safeAttrs.push(`rel="${sanitizeRelAttribute(value)}"`);
        continue;
      }
      if (name === "target" && value === "_blank") {
        safeAttrs.push('target="_blank"');
        continue;
      }
      if (name === "class") {
        const classes = value
          .split(/\s+/)
          .filter((cls) => ALIGN_CLASSES.has(cls));
        if (classes.length > 0) {
          safeAttrs.push(`class="${classes.join(" ")}"`);
        }
        continue;
      }
      if (name === "alt" || name === "title") {
        safeAttrs.push(`${name}="${escapeHtml(value)}"`);
        continue;
      }
      if (name === "data-align") {
        const align = value.toLowerCase();
        if (["left", "center", "right"].includes(align)) {
          safeAttrs.push(`data-align="${align}"`);
        }
        continue;
      }
      if ((name === "colspan" || name === "rowspan") && /^\d+$/.test(value)) {
        safeAttrs.push(`${name}="${value}"`);
      }
    }

    if (tag === "a" && !safeAttrs.some((attr) => attr.startsWith("href="))) {
      return "";
    }
    if (tag === "img" && !safeAttrs.some((attr) => attr.startsWith("src="))) {
      return "";
    }

    if (tag === "a" && !safeAttrs.some((attr) => attr.startsWith("rel="))) {
      safeAttrs.push('rel="noopener noreferrer"');
    }

    return safeAttrs.length > 0 ? `<${tag} ${safeAttrs.join(" ")}>` : `<${tag}>`;
  });
}

function isRawHtmlLine(line: string) {
  const trimmed = line.trim();
  return /^<[a-z][\s\S]*>$/i.test(trimmed) || /^<\/[a-z]+>$/i.test(trimmed);
}

/** Promote markdown H1 (# ) to H2 — page title is the only H1. */
export function normalizeContentPostHeadings(markdown: string): string {
  return markdown.replace(/^#\s+(?!#)/gm, "## ");
}

export function renderContentPostToSafeHtml(content: string): string {
  const normalized = normalizeContentPostHeadings(sanitizePlainContent(content));

  if (/<(h[2-4]|p|ul|ol|table|blockquote|img|figure|div|a|strong|em|u)\b/i.test(normalized.trim())) {
    return sanitizeContentPostHtmlFragment(normalized);
  }

  const lines = normalized.split("\n");
  const htmlParts: string[] = [];
  let inUl = false;
  let inOl = false;
  let tableRows: string[][] | null = null;

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

  function flushTable() {
    if (!tableRows || tableRows.length === 0) {
      tableRows = null;
      return;
    }
    const [header, ...body] = tableRows;
    htmlParts.push("<table><thead><tr>");
    for (const cell of header) {
      htmlParts.push(`<th>${parseInlineMarkdown(cell)}</th>`);
    }
    htmlParts.push("</tr></thead><tbody>");
    for (const row of body) {
      htmlParts.push("<tr>");
      for (const cell of row) {
        htmlParts.push(`<td>${parseInlineMarkdown(cell)}</td>`);
      }
      htmlParts.push("</tr>");
    }
    htmlParts.push("</tbody></table>");
    tableRows = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      closeLists();
      flushTable();
      continue;
    }

    if (isMarkdownTableRow(trimmed)) {
      closeLists();
      if (isMarkdownTableSeparator(trimmed)) {
        continue;
      }
      if (!tableRows) {
        tableRows = [];
      }
      tableRows.push(parseMarkdownTableRow(trimmed));
      continue;
    }

    flushTable();

    if (isRawHtmlLine(trimmed)) {
      closeLists();
      htmlParts.push(trimmed);
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

    if (/^!\[([^\]]*)\]\(([^)]+)\)\s*$/.test(trimmed)) {
      closeLists();
      const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
      if (imgMatch) {
        const safeUrl = sanitizeImageUrl(imgMatch[2]!);
        if (safeUrl) {
          htmlParts.push(
            `<p><img src="${escapeHtml(safeUrl)}" alt="${escapeHtml(imgMatch[1] ?? "")}" /></p>`
          );
        }
      }
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
      htmlParts.push(
        `<blockquote><p>${parseInlineMarkdown(trimmed.replace(/^>\s?/, ""))}</p></blockquote>`
      );
      continue;
    }

    if (trimmed === "---") {
      closeLists();
      htmlParts.push("<hr />");
      continue;
    }

    closeLists();
    htmlParts.push(`<p>${parseInlineMarkdown(trimmed)}</p>`);
  }

  closeLists();
  flushTable();

  const rawHtml = htmlParts.join("");
  return stripDisallowedHtml(sanitizeHtmlContent(rawHtml));
}
