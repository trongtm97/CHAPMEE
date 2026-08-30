"use client";

import { useCallback, useEffect, useState } from "react";
import { useInlineCommentReader } from "@/components/reader/inline-comments/InlineCommentReaderContext";
import {
  getSelectionAnchorFromRange,
  selectionSpansMultipleBlocks
} from "@/lib/inline-comments/text-offset";

export function InlineCommentPopover() {
  const ctx = useInlineCommentReader();
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);

  const clearSelection = useCallback(() => {
    setVisible(false);
    setSelectionRect(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    if (!ctx?.enabled) {
      return;
    }

    const reader = ctx;

    function handleSelectionChange() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setVisible(false);
        setSelectionRect(null);
        reader.setSelectionError(null);
        return;
      }

      const range = selection.getRangeAt(0);
      if (selectionSpansMultipleBlocks(range)) {
        reader.setSelectionError("Vui lòng chọn trong một đoạn.");
        setVisible(false);
        setSelectionRect(null);
        return;
      }

      reader.setSelectionError(null);
      const anchor = getSelectionAnchorFromRange(range);
      if (!anchor) {
        setVisible(false);
        setSelectionRect(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setVisible(false);
        setSelectionRect(null);
        return;
      }

      setSelectionRect(rect);
      setVisible(true);
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [ctx]);

  if (!ctx?.enabled || !visible || !selectionRect) {
    return null;
  }

  return (
    <div
      className="fixed z-[180] -translate-x-1/2"
      role="presentation"
      style={{
        left: selectionRect.left + selectionRect.width / 2,
        top: Math.max(8, selectionRect.top - 44)
      }}
    >
      <button
        className="rounded-full bg-cyan-300 px-3 py-1.5 text-xs font-bold text-zinc-950 shadow-lg"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) {
            return;
          }
          const anchor = getSelectionAnchorFromRange(selection.getRangeAt(0));
          if (!anchor) {
            return;
          }
          ctx.setActiveBlockId(anchor.blockId);
          ctx.setPendingAnchor(anchor);
          ctx.setOpenThreadId(null);
          clearSelection();
        }}
        type="button"
      >
        Bình luận đoạn này
      </button>
    </div>
  );
}
