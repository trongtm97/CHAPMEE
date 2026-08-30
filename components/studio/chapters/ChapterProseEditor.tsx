"use client";

import { useState } from "react";
import { EditorCanvas, type EditorCanvasHandle } from "@/components/editor/EditorCanvas";

type ChapterProseEditorProps = {
  canvasRef: React.RefObject<EditorCanvasHandle | null>;
  content: string;
  disabled?: boolean;
  imageCount: number;
  imageLimitReached: boolean;
  onChange: (value: string) => void;
  onInsertImage: () => void;
  onInsertTemplate: () => void;
  onNormalize?: () => void;
  onRedo: () => void;
  onSaveTemplate: () => void;
  onUndo: () => void;
};

export function ChapterProseEditor({
  canvasRef,
  content,
  disabled = false,
  imageCount,
  imageLimitReached,
  onChange,
  onInsertImage,
  onInsertTemplate,
  onNormalize,
  onRedo,
  onSaveTemplate,
  onUndo
}: ChapterProseEditorProps) {
  const [focusMode, setFocusMode] = useState(false);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-950/80 px-3 text-xs font-semibold text-zinc-200 transition hover:bg-white/10 disabled:opacity-40"
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
      <button
        className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-950/80 px-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 disabled:opacity-40"
        disabled={disabled}
        onClick={onUndo}
        title="Hoàn tác"
        type="button"
      >
        ↶
      </button>
      <button
        className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-950/80 px-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 disabled:opacity-40"
        disabled={disabled}
        onClick={onRedo}
        title="Làm lại"
        type="button"
      >
        ↷
      </button>
      <button
        className="inline-flex h-9 items-center rounded-lg border border-white/10 bg-zinc-950/80 px-3 text-xs font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-40"
        disabled={disabled}
        onClick={onInsertTemplate}
        type="button"
      >
        Chèn mẫu
      </button>
      <button
        className="inline-flex h-9 items-center rounded-lg border border-white/10 bg-zinc-950/80 px-3 text-xs font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-40"
        disabled={disabled || !content.trim()}
        onClick={onSaveTemplate}
        type="button"
      >
        Lưu thành mẫu
      </button>
      {onNormalize ? (
        <button
          className="inline-flex h-9 items-center rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 text-xs font-semibold text-amber-200 hover:bg-amber-400/20 disabled:opacity-40"
          disabled={disabled || !content.trim()}
          onClick={onNormalize}
          title="Chuẩn hoá khoảng trắng, xuống dòng, dấu câu"
          type="button"
        >
          Chuẩn hoá
        </button>
      ) : null}
      <button
        aria-label={focusMode ? "Thoát chế độ tập trung" : "Chế độ tập trung"}
        className="inline-flex h-9 items-center rounded-lg border border-white/10 bg-zinc-950/80 px-3 text-xs font-semibold text-zinc-200 hover:bg-white/10"
        onClick={() => setFocusMode((open) => !open)}
        type="button"
      >
        {focusMode ? "Thoát focus" : "Focus"}
      </button>
    </div>
  );

  const editor = (
    <div
      className={`overflow-hidden rounded-xl border transition ${
        focusMode
          ? "border-cyan-400/40 ring-2 ring-cyan-400/20"
          : "border-white/10 focus-within:border-cyan-400/30 focus-within:ring-1 focus-within:ring-cyan-400/20"
      } bg-[#0c1018]`}
      data-chapter-field="content"
    >
      <EditorCanvas disabled={disabled} onChange={onChange} ref={canvasRef} value={content} />
    </div>
  );

  return (
    <section
      className={
        focusMode
          ? "fixed inset-0 z-40 flex flex-col bg-[#070b12] p-3 sm:p-6"
          : "space-y-3"
      }
    >
      <div
        className={
          focusMode
            ? "mb-3 shrink-0"
            : "sticky top-[7.5rem] z-10 -mx-1 bg-[#070b12]/90 px-1 py-2 backdrop-blur-sm"
        }
      >
        {toolbar}
      </div>
      <div className={focusMode ? "min-h-0 flex-1 overflow-y-auto" : undefined}>{editor}</div>
    </section>
  );
}
