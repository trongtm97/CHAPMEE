"use client";

import { InlineCommentThread } from "@/components/reader/inline-comments/InlineCommentThread";
import { ReaderSheet } from "@/components/reader/ReaderSheet";
import { useInlineCommentReader } from "@/components/reader/inline-comments/InlineCommentReaderContext";

type InlineCommentSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
};

export function InlineCommentSheet({ onClose, open, title = "Bình luận đoạn" }: InlineCommentSheetProps) {
  return (
    <ReaderSheet className="lg:hidden" onClose={onClose} open={open} title={title}>
      <InlineCommentThread />
    </ReaderSheet>
  );
}

export function InlineCommentSheetHost() {
  const ctx = useInlineCommentReader();
  if (!ctx?.enabled) {
    return null;
  }

  const open = Boolean(ctx.openThreadId || ctx.pendingAnchor);

  return (
    <InlineCommentSheet
      onClose={() => {
        ctx.setOpenThreadId(null);
        ctx.setPendingAnchor(null);
        ctx.setActiveBlockId(null);
      }}
      open={open}
    />
  );
}
