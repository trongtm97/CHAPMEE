import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageBlockNodeView } from "@/components/editor/tiptap/ImageBlockNodeView";

function normalizeAlign(value: unknown): "left" | "center" | "right" {
  return value === "left" || value === "right" ? value : "center";
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    postImage: {
      setPostImage: (attrs: {
        src: string;
        alt?: string;
        caption?: string;
        align?: "left" | "center" | "right";
      }) => ReturnType;
    };
  }
}

/** Block image for the content-post editor: selectable, alignable, with alt + caption. */
export const PostImageNode = Node.create({
  name: "postImage",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) =>
          element.tagName.toLowerCase() === "img"
            ? element.getAttribute("src")
            : element.querySelector("img")?.getAttribute("src") ?? null
      },
      alt: {
        default: "",
        parseHTML: (element) =>
          element.tagName.toLowerCase() === "img"
            ? element.getAttribute("alt") ?? ""
            : element.querySelector("img")?.getAttribute("alt") ?? ""
      },
      caption: {
        default: "",
        parseHTML: (element) => element.querySelector("figcaption")?.textContent?.trim() ?? ""
      },
      align: {
        default: "center",
        parseHTML: (element) => normalizeAlign(element.getAttribute("data-align"))
      }
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-post-image]" }, { tag: "img" }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockNodeView);
  },

  renderHTML({ HTMLAttributes }) {
    const align = normalizeAlign(HTMLAttributes.align);
    const img: ["img", Record<string, string>] = [
      "img",
      {
        alt: HTMLAttributes.alt || "",
        src: HTMLAttributes.src ?? ""
      }
    ];

    const figureAttrs = mergeAttributes({
      class: `post-image post-align-${align}`,
      "data-post-image": "true",
      "data-align": align
    });

    const caption = (HTMLAttributes.caption as string | undefined)?.trim();
    if (caption) {
      return ["figure", figureAttrs, img, ["figcaption", {}, caption]];
    }
    return ["figure", figureAttrs, img];
  },

  addCommands() {
    return {
      setPostImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              src: attrs.src,
              alt: attrs.alt ?? "",
              caption: attrs.caption ?? "",
              align: normalizeAlign(attrs.align)
            }
          })
    };
  }
});
