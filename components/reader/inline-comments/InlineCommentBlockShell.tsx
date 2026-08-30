"use client";

import { useContext, type ReactNode } from "react";
import { InlineCommentBubble } from "@/components/reader/inline-comments/InlineCommentBubble";
import { InlineCommentReaderContext } from "@/components/reader/inline-comments/InlineCommentReaderContext";
import {
  BLOCK_ID_DATA_ATTR,
  BLOCK_INDEX_DATA_ATTR
} from "@/lib/reader/block-ids";
import { getParagraphAnchorFromBlock } from "@/lib/inline-comments/text-offset";

type InlineCommentBlockShellProps = {
  blockId: string | null;
  blockIndex?: number | null;
  className?: string;
  children: ReactNode;
};

export function InlineCommentBlockShell({
  blockId,
  blockIndex = null,
  children,
  className = ""
}: InlineCommentBlockShellProps) {
  const ctx = useContext(InlineCommentReaderContext);
  const counts = blockId && ctx ? ctx.blockCounts[blockId] : null;
  const commentCount = counts?.commentCount ?? 0;

  if (!blockId) {
    return <>{children}</>;
  }

  const shellProps = {
    [BLOCK_ID_DATA_ATTR]: blockId,
    ...(blockIndex != null ? { [BLOCK_INDEX_DATA_ATTR]: String(blockIndex) } : {})
  };

  if (!ctx?.enabled) {
    return (
      <div className={className} {...shellProps}>
        {children}
      </div>
    );
  }

  function openBlockThreads() {
    if (!ctx || !blockId) {
      return;
    }
    ctx.setActiveBlockId(blockId);
    ctx.setPendingAnchor(null);
    ctx.setOpenThreadId(null);
  }

  function composeOnBlock() {
    if (!ctx || !blockId) {
      return;
    }
    const element = document.querySelector(
      `[${BLOCK_ID_DATA_ATTR}="${CSS.escape(blockId)}"]`
    ) as HTMLElement | null;
    const anchor = element ? getParagraphAnchorFromBlock(element) : null;
    if (!anchor) {
      return;
    }
    ctx.setActiveBlockId(blockId);
    ctx.setPendingAnchor(anchor);
    ctx.setOpenThreadId(null);
  }

  return (
    <div className={`group relative ${className}`.trim()} {...shellProps}>
      {children}
      <InlineCommentBubble
        blockId={blockId}
        commentCount={commentCount}
        onCompose={composeOnBlock}
        onOpen={openBlockThreads}
      />
    </div>
  );
}
