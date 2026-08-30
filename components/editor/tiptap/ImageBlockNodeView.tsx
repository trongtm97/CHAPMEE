"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Pencil,
  Trash2
} from "lucide-react";
import { buildChapterImageBlockToken } from "@/lib/editor/chapter-image-block";
import type { ChapterImageBlock } from "@/types/chapter-images";

type Align = "left" | "center" | "right";

function normalizeAlign(value: unknown): Align {
  return value === "left" || value === "right" ? value : "center";
}

const figureAlignClass: Record<Align, string> = {
  left: "mr-auto ml-0",
  center: "mx-auto",
  right: "ml-auto mr-0"
};

/**
 * Rebuild the chapter token so stored content stays in sync with edits.
 * Parses the raw JSON (not the resolver) to preserve object keys for src/thumbSrc.
 */
function rebuildChapterToken(
  tokenAttr: string | null | undefined,
  next: { alt: string; caption: string; align: Align }
): string | null {
  if (!tokenAttr) {
    return null;
  }
  try {
    const decoded = decodeURIComponent(tokenAttr);
    const match = /^\[\[chapmee-image\s+(\{[\s\S]*\})\s*\]\]$/.exec(decoded.trim());
    if (!match) {
      return null;
    }
    const raw = JSON.parse(match[1]) as Partial<ChapterImageBlock>;
    if (typeof raw.src !== "string" || typeof raw.thumbSrc !== "string") {
      return null;
    }
    return encodeURIComponent(
      buildChapterImageBlockToken({
        alt: next.alt,
        align: next.align,
        caption: next.caption,
        height: typeof raw.height === "number" ? raw.height : 720,
        id: typeof raw.id === "string" ? raw.id : "",
        mediaAssetId: raw.mediaAssetId,
        src: raw.src,
        thumbSrc: raw.thumbSrc,
        width: typeof raw.width === "number" ? raw.width : 1280
      })
    );
  } catch {
    return null;
  }
}

export function ImageBlockNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor
}: NodeViewProps) {
  const isChapter = node.type.name === "chapterImage";
  const align = normalizeAlign(node.attrs.align);
  const alt = (node.attrs.alt as string) ?? "";
  const caption = (node.attrs.caption as string) ?? "";
  const src = (node.attrs.src as string) ?? "";
  const editable = editor.isEditable;

  const [editing, setEditing] = useState(false);
  const [draftAlt, setDraftAlt] = useState(alt);
  const [draftCaption, setDraftCaption] = useState(caption);

  function commit(next: { alt?: string; caption?: string; align?: Align }) {
    const merged = {
      alt: next.alt ?? alt,
      caption: next.caption ?? caption,
      align: next.align ?? align
    };
    const attrs: Record<string, unknown> = { ...merged };
    if (isChapter) {
      const token = rebuildChapterToken(node.attrs.token as string | null, merged);
      if (token) {
        attrs.token = token;
      }
    }
    updateAttributes(attrs);
  }

  function saveMeta() {
    commit({ alt: draftAlt, caption: draftCaption.trim() });
    setEditing(false);
  }

  return (
    <NodeViewWrapper
      className={`tiptap-image-block relative my-4 w-full ${selected ? "is-selected" : ""}`}
      data-align={align}
    >
      <figure
        className={`relative w-fit max-w-full overflow-hidden rounded-xl border ${
          selected ? "border-cyan-400" : "border-white/10"
        } bg-black/20 ${figureAlignClass[align]}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={alt || "Ảnh"} className="block max-w-full" draggable={false} src={src} />
        {caption ? (
          <figcaption className="px-2 py-1 text-center text-sm text-zinc-400">{caption}</figcaption>
        ) : null}
      </figure>

      {editable && selected ? (
        <div
          className="absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-white/15 bg-zinc-900/95 p-1 shadow-lg"
          contentEditable={false}
        >
          {(["left", "center", "right"] as const).map((value) => {
            const Icon = value === "left" ? AlignLeft : value === "center" ? AlignCenter : AlignRight;
            return (
              <button
                className={`rounded-md p-1.5 transition hover:bg-white/10 ${
                  align === value ? "bg-cyan-500/20 text-cyan-200" : "text-zinc-300"
                }`}
                key={value}
                onClick={() => commit({ align: value })}
                onMouseDown={(event) => event.preventDefault()}
                title={value === "left" ? "Canh trái" : value === "center" ? "Canh giữa" : "Canh phải"}
                type="button"
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
          <span className="mx-0.5 h-5 w-px bg-white/10" />
          <button
            className="rounded-md p-1.5 text-zinc-300 transition hover:bg-white/10"
            onClick={() => {
              setDraftAlt(alt);
              setDraftCaption(caption);
              setEditing((prev) => !prev);
            }}
            onMouseDown={(event) => event.preventDefault()}
            title="Sửa mô tả / chú thích"
            type="button"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className="rounded-md p-1.5 text-rose-300 transition hover:bg-rose-500/20"
            onClick={() => deleteNode()}
            onMouseDown={(event) => event.preventDefault()}
            title="Xoá ảnh"
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {editable && selected && editing ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-zinc-950/95 p-4 backdrop-blur-sm"
          contentEditable={false}
        >
          <div className="w-full max-w-sm space-y-3 rounded-xl border border-white/15 bg-zinc-900 p-4 shadow-2xl">
            <p className="text-sm font-semibold text-white">Thông tin ảnh</p>
            <label className="block text-xs font-medium text-zinc-300">
              Văn bản thay thế (alt)
              <input
                className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/60"
                onChange={(event) => setDraftAlt(event.target.value)}
                placeholder="Mô tả ảnh cho SEO / trình đọc màn hình"
                value={draftAlt}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-300">
              Chú thích hiển thị
              <input
                className="mt-1 w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/60"
                onChange={(event) => setDraftCaption(event.target.value)}
                placeholder="Chú thích dưới ảnh (tuỳ chọn)"
                value={draftCaption}
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                className="rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                onClick={() => setEditing(false)}
                type="button"
              >
                Huỷ
              </button>
              <button
                className="rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-400"
                onClick={saveMeta}
                type="button"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}
