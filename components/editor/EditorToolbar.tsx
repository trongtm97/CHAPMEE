"use client";

import type { TextareaFormatAction } from "@/lib/editor/text-format";

type EditorToolbarProps = {
  disabled?: boolean;
  imageCount?: number;
  imageLimitReached?: boolean;
  onFormat: (action: TextareaFormatAction) => void;
  onInsertImage?: () => void;
  onRedo?: () => void;
  onUndo?: () => void;
};

const buttons: Array<{ action: TextareaFormatAction; label: string; title: string }> =
  [
    { action: "bold", label: "B", title: "In đậm (Ctrl+B)" },
    { action: "italic", label: "I", title: "In nghiêng (Ctrl+I)" },
    { action: "quote", label: "❝", title: "Trích dẫn" },
    { action: "heading", label: "H", title: "Tiêu đề nhỏ" },
    { action: "divider", label: "—", title: "Ngăn cách" },
    { action: "clear", label: "⌫", title: "Xóa định dạng" }
  ];

export function EditorToolbar({
  disabled,
  imageCount = 0,
  imageLimitReached,
  onFormat,
  onInsertImage,
  onRedo,
  onUndo
}: EditorToolbarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-zinc-950/80 p-1.5"
      role="toolbar"
    >
      {onInsertImage ? (
        <button
          className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold text-zinc-200 transition hover:bg-white/10 disabled:opacity-40"
          disabled={disabled || imageLimitReached}
          onClick={onInsertImage}
          title={
            imageLimitReached
              ? "Bạn đã đạt giới hạn ảnh trong chương này."
              : "Chèn ảnh"
          }
          type="button"
        >
          Chèn ảnh{imageCount > 0 ? ` (${imageCount})` : ""}
        </button>
      ) : null}
      {buttons.map((button) => (
        <button
          className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold text-zinc-200 transition hover:bg-white/10 disabled:opacity-40"
          disabled={disabled}
          key={button.action}
          onClick={() => onFormat(button.action)}
          title={button.title}
          type="button"
        >
          {button.label}
        </button>
      ))}
      {onUndo ? (
        <button
          className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 disabled:opacity-40"
          disabled={disabled}
          onClick={onUndo}
          title="Hoàn tác"
          type="button"
        >
          ↶
        </button>
      ) : null}
      {onRedo ? (
        <button
          className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 disabled:opacity-40"
          disabled={disabled}
          onClick={onRedo}
          title="Làm lại"
          type="button"
        >
          ↷
        </button>
      ) : null}
    </div>
  );
}
