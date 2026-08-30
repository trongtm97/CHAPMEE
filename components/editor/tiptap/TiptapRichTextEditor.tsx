"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import { InsertTableDialog } from "@/components/editor/InsertTableDialog";
import { MediaLibraryDialog } from "@/components/editor/MediaLibraryDialog";
import { TiptapLinkDialog, type LinkDialogState } from "@/components/editor/tiptap/TiptapLinkDialog";
import { TiptapToolbar } from "@/components/editor/tiptap/TiptapToolbar";
import {
  chapterImageBlockToNodeAttrs
} from "@/lib/editor/tiptap/chapter-image-node";
import {
  createTiptapExtensions,
  type TiptapEditorProfile
} from "@/lib/editor/tiptap/create-extensions";
import { buildContentPostLink } from "@/lib/content-posts/editor-insert";
import type { ChapterImageBlock } from "@/types/chapter-images";

export type TiptapEditorHandle = {
  focus: () => void;
  getTextarea: () => HTMLTextAreaElement | null;
  insertImageBlock: (block: ChapterImageBlock) => void;
  runFormat: (command: string, value?: string) => void;
};

type EditorMode = "visual" | "html";

type Props = {
  disabled?: boolean;
  htmlToValue: (html: string) => string;
  label?: string;
  minHeightClass?: string;
  name?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  profile: TiptapEditorProfile;
  surfaceClass?: string;
  toolbarHint?: string;
  value: string;
  valueToHtml: (value: string) => string;
  onImageUpload?: (file: File) => Promise<{ ok: boolean; previewUrl?: string; message?: string }>;
};

const defaultLinkDialog: LinkDialogState = {
  url: "https://",
  label: "Nhãn link",
  newTab: true,
  nofollow: false
};

function buildLinkRel(input: LinkDialogState) {
  const parts: string[] = [];
  if (input.nofollow) {
    parts.push("nofollow");
  }
  if (input.newTab) {
    parts.push("noopener", "noreferrer");
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export const TiptapRichTextEditor = forwardRef<TiptapEditorHandle, Props>(
  function TiptapRichTextEditor(
    {
      disabled,
      htmlToValue,
      label,
      minHeightClass = "",
      name,
      onChange,
      placeholder,
      profile,
      surfaceClass = "",
      toolbarHint,
      value,
      valueToHtml,
      onImageUpload
    },
    ref
  ) {
    const lastEmittedRef = useRef(value);
    const [mode, setMode] = useState<EditorMode>("visual");
    const [htmlDraft, setHtmlDraft] = useState("");
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [showTableDialog, setShowTableDialog] = useState(false);
    const [showMediaDialog, setShowMediaDialog] = useState(false);
    const [linkDialog, setLinkDialog] = useState<LinkDialogState>(defaultLinkDialog);
    const isExternalUpdateRef = useRef(false);

    const emitFromHtml = useCallback(
      (html: string) => {
        const next = htmlToValue(html);
        lastEmittedRef.current = next;
        onChange(next);
      },
      [htmlToValue, onChange]
    );

    const editor = useEditor({
      immediatelyRender: false,
      editable: !disabled,
      extensions: createTiptapExtensions(profile, placeholder),
      content: valueToHtml(value),
      onUpdate: ({ editor: ed }) => {
        if (isExternalUpdateRef.current || mode !== "visual") {
          return;
        }
        emitFromHtml(ed.getHTML());
      }
    });

    const syncEditorFromValue = useCallback(
      (source: string) => {
        if (!editor) {
          return;
        }
        isExternalUpdateRef.current = true;
        editor.commands.setContent(valueToHtml(source), { emitUpdate: false });
        isExternalUpdateRef.current = false;
      },
      [editor, valueToHtml]
    );

    useEffect(() => {
      if (!editor || mode !== "visual") {
        return;
      }
      if (value === lastEmittedRef.current) {
        return;
      }
      syncEditorFromValue(value);
      lastEmittedRef.current = value;
    }, [value, mode, editor, syncEditorFromValue]);

    useEffect(() => {
      if (!editor) {
        return;
      }
      editor.setEditable(!disabled);
    }, [disabled, editor]);

    const insertImageBlock = useCallback(
      (block: ChapterImageBlock) => {
        if (!editor) {
          return;
        }
        editor
          .chain()
          .focus()
          .insertContent([
            { type: "chapterImage", attrs: chapterImageBlockToNodeAttrs(block) },
            { type: "paragraph" }
          ])
          .run();
        emitFromHtml(editor.getHTML());
      },
      [editor, emitFromHtml]
    );

    const runFormat = useCallback(
      (command: string, commandValue?: string) => {
        if (!editor) {
          return;
        }
        const chain = editor.chain().focus();
        switch (command) {
          case "bold":
            chain.toggleBold().run();
            break;
          case "italic":
            chain.toggleItalic().run();
            break;
          case "underline":
            chain.toggleUnderline().run();
            break;
          case "formatBlock":
            if (commandValue === "h3") {
              chain.toggleHeading({ level: 3 }).run();
            } else if (commandValue === "blockquote") {
              chain.toggleBlockquote().run();
            }
            break;
          case "insertHorizontalRule":
            chain.setHorizontalRule().run();
            break;
          case "insertUnorderedList":
            chain.toggleBulletList().run();
            break;
          default:
            break;
        }
        emitFromHtml(editor.getHTML());
      },
      [editor, emitFromHtml]
    );

    useImperativeHandle(
      ref,
      () => ({
        focus: () => editor?.commands.focus(),
        getTextarea: () => null,
        insertImageBlock,
        runFormat
      }),
      [editor, insertImageBlock, runFormat]
    );

    function switchMode(nextMode: EditorMode) {
      if (nextMode === mode) {
        return;
      }

      if (mode === "visual" && editor) {
        emitFromHtml(editor.getHTML());
        if (nextMode === "html") {
          setHtmlDraft(valueToHtml(lastEmittedRef.current));
        }
      } else if (nextMode === "visual") {
        const plain = htmlToValue(htmlDraft);
        lastEmittedRef.current = plain;
        onChange(plain);
        syncEditorFromValue(plain);
      }

      setMode(nextMode);
    }

    function openLinkDialog() {
      const selected = editor?.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to
      );
      setLinkDialog({
        ...defaultLinkDialog,
        label: selected?.trim() || defaultLinkDialog.label
      });
      setShowLinkDialog(true);
    }

    function confirmInsertLink() {
      if (!editor) {
        return;
      }
      const url = linkDialog.url.trim();
      if (!url) {
        return;
      }

      const rel = buildLinkRel(linkDialog);
      const target = linkDialog.newTab ? "_blank" : undefined;
      const { empty } = editor.state.selection;

      if (!empty) {
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url, target, rel })
          .run();
      } else {
        const label = linkDialog.label.trim() || url;
        editor
          .chain()
          .focus()
          .insertContent(buildContentPostLink(url, label, { newTab: linkDialog.newTab, nofollow: linkDialog.nofollow }))
          .run();
      }

      emitFromHtml(editor.getHTML());
      setShowLinkDialog(false);
    }

    async function handleMediaUpload(file: File) {
      if (!onImageUpload) {
        return { ok: false as const, message: "Tải ảnh không khả dụng." };
      }
      const result = await onImageUpload(file);
      if (!result.ok || !result.previewUrl) {
        return { ok: false as const, message: result.message ?? "Không thể tải ảnh lên." };
      }
      return {
        ok: true as const,
        image: {
          id: `upload-${Date.now()}`,
          source: "asset" as const,
          url: result.previewUrl,
          objectKey: result.previewUrl,
          thumbUrl: result.previewUrl,
          thumbKey: result.previewUrl,
          width: null,
          height: null,
          alt: "",
          caption: "",
          createdAt: new Date().toISOString()
        }
      };
    }

    function insertLibraryImage(image: { url: string; alt: string; caption: string }) {
      if (!editor) {
        return;
      }
      editor
        .chain()
        .focus()
        .setPostImage({ src: image.url, alt: image.alt, caption: image.caption })
        .run();
      emitFromHtml(editor.getHTML());
    }

    const modeToggleClass =
      profile === "chapter"
        ? "inline-flex rounded-lg border border-white/10 bg-zinc-950/80 p-0.5"
        : "inline-flex rounded-xl border border-white/10 bg-zinc-900/80 p-0.5";

    const modeButtonClass = (active: boolean) =>
      profile === "chapter"
        ? `rounded-md px-2.5 py-1 text-xs font-medium ${active ? "bg-white/10 text-white" : "text-zinc-400"}`
        : `rounded-lg px-3 py-1.5 text-xs font-medium transition ${active ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200"}`;

    const toolbarWrapperClass =
      profile === "chapter"
        ? "flex flex-wrap items-center gap-2 border-b border-white/10 px-2 py-2"
        : "flex flex-wrap items-center gap-2";

    const visualToolbarClass =
      profile === "chapter"
        ? undefined
        : "flex flex-wrap gap-1 rounded-xl border border-white/10 bg-zinc-900/80 p-1";

    return (
      <div className="space-y-2">
        {label ? <span className="block text-sm font-medium text-zinc-200">{label}</span> : null}
        {name ? <input name={name} type="hidden" value={value} /> : null}

        <div className={toolbarWrapperClass}>
          <div className={modeToggleClass}>
            <button
              className={modeButtonClass(mode === "visual")}
              disabled={disabled}
              onClick={() => switchMode("visual")}
              type="button"
            >
              Trực quan
            </button>
            <button
              className={modeButtonClass(mode === "html")}
              disabled={disabled}
              onClick={() => switchMode("html")}
              type="button"
            >
              HTML
            </button>
          </div>

          {toolbarHint ? <span className="text-[10px] text-zinc-500">{toolbarHint}</span> : null}

          {mode === "visual" ? (
            <div className={visualToolbarClass}>
              <TiptapToolbar
                disabled={disabled}
                editor={editor}
                onImageClick={onImageUpload ? () => setShowMediaDialog(true) : undefined}
                onLinkClick={openLinkDialog}
                onTableClick={
                  profile === "story" || profile === "content-post"
                    ? () => setShowTableDialog(true)
                    : undefined
                }
                profile={profile}
              />
            </div>
          ) : null}
        </div>

        {showMediaDialog ? (
          <MediaLibraryDialog
            onClose={() => setShowMediaDialog(false)}
            onPick={(image) =>
              insertLibraryImage({ url: image.url, alt: image.alt, caption: image.caption })
            }
            open={showMediaDialog}
            title="Thư viện ảnh bài viết"
            uploadFile={onImageUpload ? handleMediaUpload : undefined}
            uploadHint="JPG, PNG, WebP · tối đa 5MB. Ảnh đã tải sẽ lưu lại để dùng cho các bài sau."
          />
        ) : null}

        {showTableDialog ? (
          <InsertTableDialog
            onClose={() => setShowTableDialog(false)}
            onInsert={(rows, cols, headerRow) => {
              editor
                ?.chain()
                .focus()
                .insertTable({ rows, cols, withHeaderRow: headerRow })
                .run();
              if (editor) {
                emitFromHtml(editor.getHTML());
              }
            }}
            open={showTableDialog}
          />
        ) : null}

        {showLinkDialog ? (
          <TiptapLinkDialog
            linkDialog={linkDialog}
            onCancel={() => setShowLinkDialog(false)}
            onChange={setLinkDialog}
            onConfirm={confirmInsertLink}
            showLabelField={profile === "content-post"}
          />
        ) : null}

        {mode === "visual" ? (
          <EditorContent
            className={`tiptap-surface ${surfaceClass} ${minHeightClass} [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-zinc-500 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]`}
            editor={editor}
          />
        ) : (
          <textarea
            className={`${minHeightClass} w-full resize-y bg-transparent font-mono text-[13px] leading-7 text-zinc-100 outline-none placeholder:text-zinc-600 disabled:opacity-60 ${
              profile === "chapter"
                ? "min-h-[min(70vh,42rem)] max-h-[75vh] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5"
                : profile === "content-post"
                  ? "min-h-[480px] rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white placeholder:text-zinc-500"
                  : "rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white placeholder:text-zinc-500"
            }`}
            disabled={disabled}
            onChange={(event) => {
              const html = event.target.value;
              setHtmlDraft(html);
              const next = htmlToValue(html);
              lastEmittedRef.current = next;
              onChange(next);
            }}
            placeholder="Chèn hoặc chỉnh sửa mã HTML…"
            spellCheck={false}
            value={htmlDraft}
          />
        )}

      </div>
    );
  }
);
