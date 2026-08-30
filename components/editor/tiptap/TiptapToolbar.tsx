"use client";

import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Code2,
  Eraser,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Type,
  Underline as UnderlineIcon,
  Undo2
} from "lucide-react";
import type { TiptapEditorProfile } from "@/lib/editor/tiptap/create-extensions";

type Props = {
  disabled?: boolean;
  editor: Editor | null;
  imageLoading?: boolean;
  onImageClick?: () => void;
  onLinkClick?: () => void;
  onTableClick?: () => void;
  profile: TiptapEditorProfile;
};

const TEXT_COLORS = [
  "#f87171",
  "#fb923c",
  "#facc15",
  "#4ade80",
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#ffffff",
  "#a1a1aa"
];

const HIGHLIGHT_COLORS = [
  "#fde047",
  "#86efac",
  "#7dd3fc",
  "#f9a8d4",
  "#fca5a5",
  "#d8b4fe"
];

const btnClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40";

const activeClass = "bg-cyan-500/20 text-cyan-200";

function Btn({
  active,
  children,
  disabled,
  onClick,
  title
}: {
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      aria-label={title}
      aria-pressed={active}
      className={`${btnClass} ${active ? activeClass : ""}`}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 my-1 w-px self-stretch bg-white/10" />;
}

function ColorMenu({
  colors,
  disabled,
  icon,
  onClear,
  onPick,
  title
}: {
  colors: string[];
  disabled?: boolean;
  icon: React.ReactNode;
  onClear: () => void;
  onPick: (color: string) => void;
  title: string;
}) {
  return (
    <div className="group relative">
      <button
        aria-label={title}
        className={btnClass}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        title={title}
        type="button"
      >
        {icon}
      </button>
      <div className="invisible absolute left-0 top-full z-20 mt-1 w-max rounded-lg border border-white/10 bg-zinc-900 p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <div className="grid grid-cols-5 gap-1">
          {colors.map((color) => (
            <button
              aria-label={color}
              className="h-5 w-5 rounded border border-white/20"
              key={color}
              onClick={() => onPick(color)}
              onMouseDown={(event) => event.preventDefault()}
              style={{ backgroundColor: color }}
              type="button"
            />
          ))}
        </div>
        <button
          className="mt-2 w-full rounded-md border border-white/10 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/10"
          onClick={onClear}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          Bỏ màu
        </button>
      </div>
    </div>
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

  const run = (fn: () => void) => () => {
    fn();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5" onMouseDown={(event) => event.preventDefault()}>
      <Btn
        disabled={disabled || !editor.can().undo()}
        onClick={run(() => editor.chain().focus().undo().run())}
        title="Hoàn tác"
      >
        <Undo2 className="h-4 w-4" />
      </Btn>
      <Btn
        disabled={disabled || !editor.can().redo()}
        onClick={run(() => editor.chain().focus().redo().run())}
        title="Làm lại"
      >
        <Redo2 className="h-4 w-4" />
      </Btn>

      <Divider />

      <Btn
        active={editor.isActive("paragraph")}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().setParagraph().run())}
        title="Đoạn văn"
      >
        <Pilcrow className="h-4 w-4" />
      </Btn>
      <Btn
        active={editor.isActive("heading", { level: 2 })}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        title="Tiêu đề H2"
      >
        <Heading2 className="h-4 w-4" />
      </Btn>
      <Btn
        active={editor.isActive("heading", { level: 3 })}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        title="Tiêu đề H3"
      >
        <Heading3 className="h-4 w-4" />
      </Btn>
      <Btn
        active={editor.isActive("heading", { level: 4 })}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().toggleHeading({ level: 4 }).run())}
        title="Tiêu đề H4"
      >
        <Heading4 className="h-4 w-4" />
      </Btn>

      <Divider />

      <Btn
        active={editor.isActive("bold")}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().toggleBold().run())}
        title="In đậm"
      >
        <Bold className="h-4 w-4" />
      </Btn>
      <Btn
        active={editor.isActive("italic")}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().toggleItalic().run())}
        title="In nghiêng"
      >
        <Italic className="h-4 w-4" />
      </Btn>
      <Btn
        active={editor.isActive("underline")}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().toggleUnderline().run())}
        title="Gạch chân"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Btn>
      <Btn
        active={editor.isActive("strike")}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().toggleStrike().run())}
        title="Gạch ngang"
      >
        <Strikethrough className="h-4 w-4" />
      </Btn>
      <Btn
        active={editor.isActive("code")}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().toggleCode().run())}
        title="Mã inline"
      >
        <Code className="h-4 w-4" />
      </Btn>

      <ColorMenu
        colors={TEXT_COLORS}
        disabled={disabled}
        icon={<Type className="h-4 w-4" />}
        onClear={() => editor.chain().focus().unsetColor().run()}
        onPick={(color) => editor.chain().focus().setColor(color).run()}
        title="Màu chữ"
      />
      <ColorMenu
        colors={HIGHLIGHT_COLORS}
        disabled={disabled}
        icon={<Highlighter className="h-4 w-4" />}
        onClear={() => editor.chain().focus().unsetHighlight().run()}
        onPick={(color) => editor.chain().focus().toggleHighlight({ color }).run()}
        title="Tô nền"
      />

      <Btn
        active={editor.isActive("subscript")}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().toggleSubscript().run())}
        title="Chỉ số dưới"
      >
        <SubscriptIcon className="h-4 w-4" />
      </Btn>
      <Btn
        active={editor.isActive("superscript")}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().toggleSuperscript().run())}
        title="Chỉ số trên"
      >
        <SuperscriptIcon className="h-4 w-4" />
      </Btn>

      <Divider />

      <Btn
        active={editor.isActive({ textAlign: "left" })}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().setTextAlign("left").run())}
        title="Căn trái"
      >
        <AlignLeft className="h-4 w-4" />
      </Btn>
      <Btn
        active={editor.isActive({ textAlign: "center" })}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().setTextAlign("center").run())}
        title="Căn giữa"
      >
        <AlignCenter className="h-4 w-4" />
      </Btn>
      <Btn
        active={editor.isActive({ textAlign: "right" })}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().setTextAlign("right").run())}
        title="Căn phải"
      >
        <AlignRight className="h-4 w-4" />
      </Btn>
      <Btn
        active={editor.isActive({ textAlign: "justify" })}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().setTextAlign("justify").run())}
        title="Căn đều"
      >
        <AlignJustify className="h-4 w-4" />
      </Btn>

      <Divider />

      <Btn
        active={editor.isActive("bulletList")}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().toggleBulletList().run())}
        title="Danh sách dấu chấm"
      >
        <List className="h-4 w-4" />
      </Btn>
      <Btn
        active={editor.isActive("orderedList")}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().toggleOrderedList().run())}
        title="Danh sách số"
      >
        <ListOrdered className="h-4 w-4" />
      </Btn>
      <Btn
        active={editor.isActive("blockquote")}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().toggleBlockquote().run())}
        title="Trích dẫn"
      >
        <Quote className="h-4 w-4" />
      </Btn>
      <Btn
        active={editor.isActive("codeBlock")}
        disabled={disabled}
        onClick={run(() => editor.chain().focus().toggleCodeBlock().run())}
        title="Khối mã"
      >
        <Code2 className="h-4 w-4" />
      </Btn>
      <Btn
        disabled={disabled}
        onClick={run(() => editor.chain().focus().setHorizontalRule().run())}
        title="Đường ngăn cách"
      >
        <Minus className="h-4 w-4" />
      </Btn>

      <Divider />

      {onLinkClick ? (
        <Btn
          active={editor.isActive("link")}
          disabled={disabled}
          onClick={onLinkClick}
          title="Chèn link"
        >
          <Link2 className="h-4 w-4" />
        </Btn>
      ) : null}
      {onImageClick ? (
        <Btn disabled={disabled || imageLoading} onClick={onImageClick} title="Chèn ảnh">
          <ImageIcon className="h-4 w-4" />
        </Btn>
      ) : null}
      {onTableClick ? (
        <Btn disabled={disabled} onClick={onTableClick} title="Chèn bảng">
          <TableIcon className="h-4 w-4" />
        </Btn>
      ) : null}

      <Divider />

      <Btn
        disabled={disabled}
        onClick={run(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}
        title="Xóa định dạng"
      >
        <Eraser className="h-4 w-4" />
      </Btn>
    </div>
  );
}
