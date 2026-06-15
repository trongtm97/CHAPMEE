"use client";

import type { Editor } from "@tiptap/react";
import type { TiptapEditorProfile } from "@/lib/editor/tiptap/create-extensions";

const toolbarButtonClass =
  "rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40";

const chapterToolbarButtonClass =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold text-zinc-200 transition hover:bg-white/10 disabled:opacity-40";

type Props = {
  disabled?: boolean;
  editor: Editor | null;
  imageLoading?: boolean;
  onImageClick?: () => void;
  onLinkClick?: () => void;
  onTableClick?: () => void;
  profile: TiptapEditorProfile;
};

function ToolbarButton({
  active,
  children,
  className = toolbarButtonClass,
  disabled,
  onClick,
  title
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      className={`${className} ${active ? "bg-white/10 text-white" : ""}`}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

export function TiptapToolbar({
  disabled,
  editor,
  imageLoading,
  onImageClick,
  onLinkClick,
  onTableClick,
  profile
}: Props) {
  if (!editor) {
    return null;
  }

  const btnClass = profile === "chapter" ? chapterToolbarButtonClass : toolbarButtonClass;

  return (
    <div className="flex flex-wrap gap-1" onMouseDown={(event) => event.preventDefault()}>
      {profile !== "chapter" ? (
        <>
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            className={btnClass}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 3 })}
            className={btnClass}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            H3
          </ToolbarButton>
          {profile === "content-post" ? (
            <ToolbarButton
              active={editor.isActive("heading", { level: 4 })}
              className={btnClass}
              disabled={disabled}
              onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            >
              H4
            </ToolbarButton>
          ) : null}
        </>
      ) : (
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          className={btnClass}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Tiêu đề nhỏ"
        >
          H
        </ToolbarButton>
      )}

      <ToolbarButton
        active={editor.isActive("bold")}
        className={`${btnClass} ${profile !== "chapter" ? "font-bold" : ""}`}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="In đậm"
      >
        B
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        className={`${btnClass} ${profile !== "chapter" ? "italic" : ""}`}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="In nghiêng"
      >
        I
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("underline")}
        className={`${btnClass} underline`}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Gạch chân"
      >
        U
      </ToolbarButton>

      {profile === "content-post" ? (
        <>
          <span className="mx-1 w-px self-stretch bg-white/10" />
          <ToolbarButton
            className={btnClass}
            disabled={disabled}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            title="Căn trái"
          >
            ≡
          </ToolbarButton>
          <ToolbarButton
            className={btnClass}
            disabled={disabled}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            title="Căn giữa"
          >
            ≡|
          </ToolbarButton>
          <ToolbarButton
            className={btnClass}
            disabled={disabled}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            title="Căn phải"
          >
            |≡
          </ToolbarButton>
        </>
      ) : null}

      {(profile === "story" || profile === "content-post") && onLinkClick ? (
        <ToolbarButton className={btnClass} disabled={disabled} onClick={onLinkClick}>
          Link
        </ToolbarButton>
      ) : null}

      {profile === "content-post" && onImageClick ? (
        <ToolbarButton className={btnClass} disabled={disabled || imageLoading} onClick={onImageClick}>
          {imageLoading ? "Đang tải ảnh…" : "Ảnh"}
        </ToolbarButton>
      ) : null}

      {(profile === "story" || profile === "content-post") && onTableClick ? (
        <ToolbarButton className={btnClass} disabled={disabled} onClick={onTableClick}>
          Bảng
        </ToolbarButton>
      ) : null}

      {profile === "chapter" || profile === "content-post" ? (
        <ToolbarButton
          active={editor.isActive("blockquote")}
          className={btnClass}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Trích dẫn"
        >
          {profile === "chapter" ? "❝" : "Quote"}
        </ToolbarButton>
      ) : null}

      {(profile === "story" || profile === "content-post") && (
        <ToolbarButton
          active={editor.isActive("bulletList")}
          className={btnClass}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          List
        </ToolbarButton>
      )}

      {profile === "chapter" || profile === "content-post" ? (
        <ToolbarButton
          className={btnClass}
          disabled={disabled}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Ngăn cách"
        >
          {profile === "chapter" ? "—" : "---"}
        </ToolbarButton>
      ) : null}
    </div>
  );
}
