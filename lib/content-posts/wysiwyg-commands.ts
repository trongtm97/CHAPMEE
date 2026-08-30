import { buildContentPostLink } from "@/lib/content-posts/editor-insert";

export function getVisualSelectionText(): string {
  return window.getSelection()?.toString().trim() ?? "";
}

export function focusVisualEditor(editor: HTMLElement | null) {
  editor?.focus();
}

export function runVisualCommand(
  editor: HTMLElement | null,
  command: string,
  value?: string
) {
  focusVisualEditor(editor);
  document.execCommand(command, false, value);
}

export function applyVisualHeading(editor: HTMLElement | null, tag: "h2" | "h3" | "h4") {
  runVisualCommand(editor, "formatBlock", tag);
}

export function applyVisualAlignment(
  editor: HTMLElement | null,
  align: "left" | "center" | "right"
) {
  const command =
    align === "center" ? "justifyCenter" : align === "right" ? "justifyRight" : "justifyLeft";
  runVisualCommand(editor, command);
}

export function insertVisualHtml(editor: HTMLElement | null, html: string) {
  runVisualCommand(editor, "insertHTML", html);
}

export function insertVisualLink(
  editor: HTMLElement | null,
  input: { url: string; label: string; newTab: boolean; nofollow: boolean }
) {
  const url = input.url.trim();
  if (!url) {
    return;
  }

  focusVisualEditor(editor);
  const selection = window.getSelection();
  const label = input.label.trim() || getVisualSelectionText() || url;

  if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
    document.execCommand("createLink", false, url);
    const anchor = findAnchorInSelection(selection);
    if (anchor) {
      applyLinkAttributes(anchor, input);
    }
    return;
  }

  insertVisualHtml(
    editor,
    buildContentPostLink(url, label, {
      newTab: input.newTab,
      nofollow: input.nofollow
    })
  );
}

export function insertVisualImage(editor: HTMLElement | null, url: string, alt: string) {
  insertVisualHtml(
    editor,
    `<p><img src="${escapeAttr(url)}" alt="${escapeAttr(alt || "Ảnh minh họa")}" /></p>`
  );
}

export function buildHtmlTable(
  rows: number,
  cols: number,
  options?: { headerRow?: boolean }
) {
  const totalRows = Math.min(20, Math.max(1, rows));
  const totalCols = Math.min(10, Math.max(1, cols));
  const headerRow = options?.headerRow ?? true;
  const emptyCell = (tag: "td" | "th") => `<${tag}><br></${tag}>`;

  let html = "<table>";

  if (headerRow) {
    html += `<thead><tr>${Array.from({ length: totalCols }, () => emptyCell("th")).join("")}</tr></thead>`;
    const bodyRows = Math.max(0, totalRows - 1);
    html += "<tbody>";
    for (let rowIndex = 0; rowIndex < bodyRows; rowIndex += 1) {
      html += `<tr>${Array.from({ length: totalCols }, () => emptyCell("td")).join("")}</tr>`;
    }
    html += "</tbody>";
  } else {
    html += "<tbody>";
    for (let rowIndex = 0; rowIndex < totalRows; rowIndex += 1) {
      html += `<tr>${Array.from({ length: totalCols }, () => emptyCell("td")).join("")}</tr>`;
    }
    html += "</tbody>";
  }

  html += "</table><p><br></p>";
  return html;
}

function findAnchorInSelection(selection: Selection) {
  const node = selection.anchorNode;
  if (!node) {
    return null;
  }
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return element?.closest("a") ?? null;
}

function applyLinkAttributes(
  anchor: HTMLAnchorElement,
  input: { newTab: boolean; nofollow: boolean }
) {
  if (input.newTab) {
    anchor.setAttribute("target", "_blank");
  } else {
    anchor.removeAttribute("target");
  }

  const relParts = ["noopener"];
  if (input.newTab) {
    relParts.push("noreferrer");
  }
  if (input.nofollow) {
    relParts.push("nofollow");
  }
  anchor.setAttribute("rel", relParts.join(" "));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
