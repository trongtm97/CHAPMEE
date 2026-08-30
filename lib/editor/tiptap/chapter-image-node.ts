import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import {
  buildChapterImageBlockToken,
  parseChapterImageBlockToken
} from "@/lib/editor/chapter-image-block";
import { ImageBlockNodeView } from "@/components/editor/tiptap/ImageBlockNodeView";
import { resolveStoredMediaUrl } from "@/lib/media/media-url";
import type { ChapterImageBlock } from "@/types/chapter-images";

function normalizeAlign(value: unknown): "left" | "center" | "right" {
  return value === "left" || value === "right" ? value : "center";
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const ChapterImageNode = Node.create({
  name: "chapterImage",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      token: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-chapter-image"),
        renderHTML: (attributes) => {
          if (!attributes.token) {
            return {};
          }
          return { "data-chapter-image": attributes.token };
        }
      },
      src: {
        default: null,
        parseHTML: (element) => element.querySelector("img")?.getAttribute("src")
      },
      alt: {
        default: "Minh họa chương",
        parseHTML: (element) => element.querySelector("img")?.getAttribute("alt") ?? "Minh họa chương"
      },
      caption: {
        default: "",
        parseHTML: (element) => element.querySelector("figcaption")?.textContent?.trim() ?? ""
      },
      align: {
        default: "center",
        parseHTML: (element) => normalizeAlign(element.getAttribute("data-align")),
        renderHTML: (attributes) => ({ "data-align": normalizeAlign(attributes.align) })
      }
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-chapter-image]" }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockNodeView);
  },

  renderHTML({ HTMLAttributes }) {
    const align = normalizeAlign(HTMLAttributes.align);
    const img: ["img", Record<string, string>] = [
      "img",
      {
        alt: HTMLAttributes.alt || "Minh họa chương",
        class: "block max-w-full",
        src: HTMLAttributes.src ?? ""
      }
    ];

    const figureAttrs = mergeAttributes(HTMLAttributes, {
      class:
        "chapter-wysiwyg-image my-4 overflow-hidden rounded-xl border border-white/10 bg-black/20",
      "data-align": align,
      contenteditable: "false"
    });

    const caption = HTMLAttributes.caption?.trim();
    if (caption) {
      return [
        "figure",
        figureAttrs,
        img,
        ["figcaption", { class: "mt-2 text-center text-sm text-zinc-500" }, caption]
      ];
    }

    return ["figure", figureAttrs, img];
  }
});

export function chapterImageBlockToNodeAttrs(block: ChapterImageBlock) {
  const token = buildChapterImageBlockToken(block);
  return {
    token: encodeURIComponent(token),
    src: resolveStoredMediaUrl(block.src) ?? block.src,
    alt: block.alt || "Minh họa chương",
    caption: block.caption,
    align: normalizeAlign(block.align)
  };
}

export function chapterImageNodeAttrsToToken(tokenAttr: string | null | undefined) {
  if (!tokenAttr) {
    return null;
  }
  try {
    const token = decodeURIComponent(tokenAttr);
    return parseChapterImageBlockToken(token) ? token : null;
  } catch {
    return null;
  }
}

export function buildChapterImageFigureHtml(block: ChapterImageBlock) {
  const token = buildChapterImageBlockToken(block);
  const caption = block.caption.trim()
    ? `<figcaption class="mt-2 text-center text-sm text-zinc-500">${escapeHtml(block.caption)}</figcaption>`
    : "";

  return `<figure contenteditable="false" data-chapter-image="${encodeURIComponent(token)}" class="chapter-wysiwyg-image my-4 overflow-hidden rounded-xl border border-white/10 bg-black/20"><img alt="${escapeHtml(block.alt || "Minh họa chương")}" class="block max-w-full" src="${escapeHtml(block.src)}" />${caption}</figure>`;
}
