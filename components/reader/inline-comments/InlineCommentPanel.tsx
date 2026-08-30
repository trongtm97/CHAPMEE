"use client";

import { InlineCommentThread } from "@/components/reader/inline-comments/InlineCommentThread";

type InlineCommentPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function InlineCommentPanel({ onClose, open }: InlineCommentPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <aside
      aria-label="Bình luận theo đoạn"
      className="fixed inset-y-0 right-0 z-[190] hidden w-full max-w-md border-l border-white/10 bg-[#0b1016] shadow-2xl lg:flex lg:flex-col"
    >
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <h2 className="text-base font-black text-zinc-50">Bình luận đoạn</h2>
        <button
          className="min-h-9 rounded-full px-3 text-sm font-semibold text-zinc-400 hover:text-zinc-200"
          onClick={onClose}
          type="button"
        >
          Đóng
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <InlineCommentThread />
      </div>
    </aside>
  );
}
