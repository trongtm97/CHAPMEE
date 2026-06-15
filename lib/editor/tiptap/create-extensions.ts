import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import type { Extensions } from "@tiptap/react";
import { ChapterImageNode } from "@/lib/editor/tiptap/chapter-image-node";

export type TiptapEditorProfile = "chapter" | "story" | "content-post";

export function createTiptapExtensions(
  profile: TiptapEditorProfile,
  placeholder?: string
): Extensions {
  const headingLevels =
    profile === "chapter" ? ([3] as const) : profile === "story" ? ([2, 3] as const) : ([2, 3, 4] as const);

  const extensions: Extensions = [
    StarterKit.configure({
      heading: { levels: [...headingLevels] },
      horizontalRule: false,
      link: false,
      underline: false
    }),
    Underline,
    HorizontalRule,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: "text-cyan-400 underline"
      }
    }),
    TextAlign.configure({
      types: profile === "content-post" ? ["heading", "paragraph"] : ["paragraph"]
    }),
    Placeholder.configure({
      placeholder: placeholder ?? "Viết nội dung…",
      emptyEditorClass: "is-editor-empty"
    })
  ];

  if (profile === "chapter") {
    extensions.push(ChapterImageNode);
  }

  if (profile === "story" || profile === "content-post") {
    extensions.push(
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell
    );
  }

  if (profile === "content-post") {
    extensions.push(
      Image.configure({
        HTMLAttributes: {
          class: "my-3 max-w-full rounded-lg"
        }
      })
    );
  }

  return extensions;
}
