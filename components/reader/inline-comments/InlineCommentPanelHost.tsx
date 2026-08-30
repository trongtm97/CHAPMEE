"use client";

import { InlineCommentPanel } from "@/components/reader/inline-comments/InlineCommentPanel";
import { useInlineCommentReader } from "@/components/reader/inline-comments/InlineCommentReaderContext";

export function InlineCommentPanelHost() {
  const ctx = useInlineCommentReader();
  if (!ctx?.enabled) {
    return null;
  }

  const open = Boolean(ctx.openThreadId || ctx.pendingAnchor || ctx.activeBlockId);

  return (
    <InlineCommentPanel
      onClose={() => {
        ctx.setOpenThreadId(null);
        ctx.setPendingAnchor(null);
        ctx.setActiveBlockId(null);
      }}
      open={open}
    />
  );
}
