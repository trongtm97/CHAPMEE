import {
  buildChapterImageBlockToken,
  parseChapterImageBlockToken,
  splitChapterContent
} from "@/lib/editor/chapter-image-block";
import { isLikelyHtmlContent } from "@/lib/content-posts/content-post-editor-html";
import { sanitizeContentPostHtmlFragment } from "@/lib/content-posts/content-post-html";
import type { ChapterImageBlock } from "@/types/chapter-images";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlinePlainToHtml(text: string) {
  let output = escapeHtml(text);
  output = output.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/_(.+?)_/g, "<em>$1</em>");
  return output;
}

function linePlainToHtml(line: string) {
  const trimmed = line.trim();

  if (trimmed.startsWith("> ")) {
    return `<blockquote>${inlinePlainToHtml(trimmed.slice(2))}</blockquote>`;
  }

  if (trimmed.startsWith("## ")) {
    return `<h3>${inlinePlainToHtml(trimmed.slice(3))}</h3>`;
  }

  if (trimmed === "---") {
    return "<hr />";
  }

  return inlinePlainToHtml(trimmed);
}

function buildChapterImageFigure(block: ChapterImageBlock) {
  const token = buildChapterImageBlockToken(block);
  const caption = block.caption.trim()
    ? `<figcaption class="mt-2 text-center text-sm text-zinc-500">${escapeHtml(block.caption)}</figcaption>`
    : "";

  return `<figure contenteditable="false" data-chapter-image="${encodeURIComponent(token)}" class="chapter-wysiwyg-image my-4 overflow-hidden rounded-xl border border-white/10 bg-black/20"><img alt="${escapeHtml(block.alt || "Minh họa chương")}" class="block max-w-full" src="${escapeHtml(block.src)}" />${caption}</figure>`;
}

function segmentTextToEditorHtml(lines: string[]) {
  const text = lines.join("\n").trim();

  if (!text) {
    return "";
  }

  if (isLikelyHtmlContent(text)) {
    return sanitizeContentPostHtmlFragment(text);
  }

  if (lines.length === 1) {
    const line = lines[0]?.trim() ?? "";

    if (line.startsWith("> ") || line.startsWith("## ") || line === "---") {
      return linePlainToHtml(line);
    }
  }

  const inner = lines.map((line) => linePlainToHtml(line)).join("<br />");
  return `<p>${inner}</p>`;
}

/** Chuyển nội dung chương (HTML / markdown nhẹ + token ảnh) sang HTML cho vùng soạn WYSIWYG. */
export function chapterPlainToEditorHtml(content: string) {
  const segments = splitChapterContent(content);

  if (segments.length === 0) {
    return "";
  }

  return segments
    .map((segment) => {
      if (segment.type === "image") {
        return buildChapterImageFigure(segment.block);
      }

      return segmentTextToEditorHtml(segment.lines);
    })
    .join("");
}

function blockElementToSerialized(element: HTMLElement): string | null {
  const tag = element.tagName.toLowerCase();

  if (tag === "figure" && element.dataset.chapterImage) {
    try {
      const token = decodeURIComponent(element.dataset.chapterImage);
      return parseChapterImageBlockToken(token) ? token : null;
    } catch {
      return null;
    }
  }

  if (tag === "hr") {
    return "<hr />";
  }

  // Preserve the full TipTap formatting of the block (color, highlight, align,
  // strike, code, sub/sup, links…) by sanitizing its complete HTML.
  const outer = element.outerHTML?.trim();
  if (!outer) {
    return null;
  }

  const sanitized = sanitizeContentPostHtmlFragment(outer).trim();
  return sanitized || null;
}

function sanitizeStoredBlock(block: string) {
  if (block.startsWith("[[chapmee-image")) {
    return block;
  }

  if (isLikelyHtmlContent(block)) {
    return sanitizeContentPostHtmlFragment(block);
  }

  return block;
}

/** Chuyển HTML từ contentEditable về định dạng lưu chương (HTML nhẹ + token ảnh). */
export function editorHtmlToChapterPlain(html: string) {
  if (typeof document === "undefined") {
    return html;
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  const parts: string[] = [];

  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        parts.push(text);
      }
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    const serialized = blockElementToSerialized(node as HTMLElement);
    if (serialized?.trim()) {
      parts.push(sanitizeStoredBlock(serialized.trim()));
    }
  }

  return parts.join("\n\n");
}

export function insertChapterImageFigureHtml(block: ChapterImageBlock) {
  return `${buildChapterImageFigure(block)}<p><br /></p>`;
}
