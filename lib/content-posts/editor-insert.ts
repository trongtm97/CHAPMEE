export type ContentPostAlign = "left" | "center" | "right";

const ALIGN_CLASS: Record<ContentPostAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right"
};

type SelectionRange = {
  start: number;
  end: number;
};

function getSelection(textarea: HTMLTextAreaElement): SelectionRange {
  return {
    end: textarea.selectionEnd,
    start: textarea.selectionStart
  };
}

export function applyWrap(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder: string
) {
  const { end, start } = getSelection(textarea);
  const value = textarea.value;
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);

  textarea.value = next;
  textarea.focus();
  const cursor = start + before.length + selected.length;
  textarea.setSelectionRange(cursor, cursor);

  return next;
}

export function applyLinePrefix(
  textarea: HTMLTextAreaElement,
  prefix: string,
  placeholder: string
) {
  const { end, start } = getSelection(textarea);
  const value = textarea.value;
  const selected = value.slice(start, end) || placeholder;
  const lines = selected.split("\n");
  const formatted = lines.map((line) => `${prefix}${line}`).join("\n");
  const next = value.slice(0, start) + formatted + value.slice(end);

  textarea.value = next;
  textarea.focus();
  const cursor = start + formatted.length;
  textarea.setSelectionRange(cursor, cursor);

  return next;
}

export function insertSnippet(textarea: HTMLTextAreaElement, snippet: string, cursorOffset = 0) {
  const { end, start } = getSelection(textarea);
  const value = textarea.value;
  const next = value.slice(0, start) + snippet + value.slice(end);

  textarea.value = next;
  textarea.focus();
  const cursor = start + snippet.length + cursorOffset;
  textarea.setSelectionRange(cursor, cursor);

  return next;
}

export function buildContentPostLink(
  url: string,
  label: string,
  options: { newTab?: boolean; nofollow?: boolean }
) {
  const relParts = ["noopener"];
  if (options.newTab) {
    relParts.push("noreferrer");
  }
  if (options.nofollow) {
    relParts.push("nofollow");
  }
  const target = options.newTab ? ' target="_blank"' : "";
  const rel = ` rel="${relParts.join(" ")}"`;
  return `<a href="${url}"${target}${rel}>${label}</a>`;
}

export function buildMarkdownTable(
  rows: number,
  cols: number,
  options?: { headerRow?: boolean }
) {
  const totalRows = Math.min(20, Math.max(1, rows));
  const totalCols = Math.min(10, Math.max(1, cols));
  const headerRow = options?.headerRow ?? true;
  const emptyCell = "";
  const separator = Array.from({ length: totalCols }, () => "---");
  const lines: string[] = [];

  if (headerRow) {
    lines.push(`| ${Array.from({ length: totalCols }, () => emptyCell).join(" | ")} |`);
    lines.push(`| ${separator.join(" | ")} |`);
    for (let rowIndex = 0; rowIndex < Math.max(0, totalRows - 1); rowIndex += 1) {
      lines.push(`| ${Array.from({ length: totalCols }, () => emptyCell).join(" | ")} |`);
    }
  } else {
    lines.push(`| ${Array.from({ length: totalCols }, () => emptyCell).join(" | ")} |`);
    lines.push(`| ${separator.join(" | ")} |`);
    for (let rowIndex = 1; rowIndex < totalRows; rowIndex += 1) {
      lines.push(`| ${Array.from({ length: totalCols }, () => emptyCell).join(" | ")} |`);
    }
  }

  return `\n${lines.join("\n")}\n\n`;
}

export function applyAlignment(textarea: HTMLTextAreaElement, align: ContentPostAlign) {
  const className = ALIGN_CLASS[align];
  const { end, start } = getSelection(textarea);
  const value = textarea.value;
  const selected = value.slice(start, end) || "Đoạn văn";
  const snippet = `<p class="${className}">${selected}</p>\n\n`;
  const next = value.slice(0, start) + snippet + value.slice(end);

  textarea.value = next;
  textarea.focus();
  const cursor = start + snippet.length;
  textarea.setSelectionRange(cursor, cursor);

  return next;
}

export function buildImageMarkdown(url: string, alt: string) {
  return `\n![${alt || "Ảnh minh họa"}](${url})\n\n`;
}
