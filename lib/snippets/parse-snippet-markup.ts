export type ParsedSnippetScript = {
  src?: string;
  async?: boolean;
  defer?: boolean;
  type?: string;
  crossOrigin?: string;
  text?: string;
};

export type ParsedSnippetHeadElement = {
  tag: "meta" | "link";
  attrs: Record<string, string>;
};

export type ParsedSnippetMarkup = {
  scripts: ParsedSnippetScript[];
  headElements: ParsedSnippetHeadElement[];
  /** HTML còn lại sau khi tách meta/link/script (cho safe_html body). */
  bodyHtml: string;
};

const SNIPPET_HTML_RE = /<\s*(script|meta|link|head)\b/i;

export function looksLikeSnippetHtml(code: string): boolean {
  return SNIPPET_HTML_RE.test(code.trim());
}

function stripHtmlComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

/** ponytail: regex parser — đủ cho paste admin (GTM, meta verify); HTML lồng phức tạp có thể parse sai. */
export function parseAttrString(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    attrs[match[1]!.toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function unwrapHead(html: string): string {
  const wrapped = html.match(/<\s*head\b[^>]*>([\s\S]*?)<\s*\/\s*head\s*>/i);
  return wrapped ? wrapped[1]! : html;
}

function stripInjectedTags(html: string): string {
  return html
    .replace(/<\s*head\b[^>]*>[\s\S]*?<\s*\/\s*head\s*>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<meta\b[^>]*\/?>/gi, "")
    .replace(/<link\b[^>]*\/?>/gi, "")
    .trim();
}

export function parseSnippetMarkup(code: string): ParsedSnippetMarkup {
  const trimmed = stripHtmlComments(code.trim());
  if (!trimmed) {
    return { scripts: [], headElements: [], bodyHtml: "" };
  }

  if (!looksLikeSnippetHtml(trimmed)) {
    return { scripts: [{ text: trimmed }], headElements: [], bodyHtml: "" };
  }

  const html = unwrapHead(trimmed);
  const scripts: ParsedSnippetScript[] = [];
  const headElements: ParsedSnippetHeadElement[] = [];

  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let scriptMatch: RegExpExecArray | null;
  while ((scriptMatch = scriptRe.exec(html))) {
    const attrs = parseAttrString(scriptMatch[1]!);
    const text = scriptMatch[2]!.trim();
    scripts.push({
      src: attrs.src || undefined,
      async: "async" in attrs,
      defer: "defer" in attrs,
      type: attrs.type || undefined,
      crossOrigin: attrs.crossorigin || undefined,
      text: text || undefined
    });
  }

  const metaRe = /<meta\b([^>]*)\/?>/gi;
  let metaMatch: RegExpExecArray | null;
  while ((metaMatch = metaRe.exec(html))) {
    headElements.push({ tag: "meta", attrs: parseAttrString(metaMatch[1]!) });
  }

  const linkRe = /<link\b([^>]*)\/?>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRe.exec(html))) {
    headElements.push({ tag: "link", attrs: parseAttrString(linkMatch[1]!) });
  }

  return {
    scripts,
    headElements,
    bodyHtml: stripInjectedTags(html)
  };
}

export function inlineScriptSource(code: string): string {
  if (!looksLikeSnippetHtml(code)) {
    return code;
  }
  return parseSnippetMarkup(code)
    .scripts.map((script) => script.text ?? "")
    .filter(Boolean)
    .join("\n");
}
