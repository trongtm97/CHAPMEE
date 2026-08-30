"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { InlineCommentPanelHost } from "@/components/reader/inline-comments/InlineCommentPanelHost";
import { InlineCommentPopover } from "@/components/reader/inline-comments/InlineCommentPopover";
import { InlineCommentSheetHost } from "@/components/reader/inline-comments/InlineCommentSheet";
import {
  InlineCommentReaderProvider,
  useInlineCommentReader
} from "@/components/reader/inline-comments/InlineCommentReaderContext";
import { getInlineCommentCountsAction } from "@/lib/inline-comments/inline-comment-actions";
import type { InlineBlockCommentCounts } from "@/types/inline-comment";
import type { SelectionAnchorPayload } from "@/lib/inline-comments/text-offset";

type InlineCommentLayerProps = {
  chapterId: string;
  storyId: string;
  contentHash: string | null;
  enabled: boolean;
  loggedIn: boolean;
  returnTo: string;
  currentUserId: string | null;
  initialBlockCounts: InlineBlockCommentCounts[];
  children: ReactNode;
};

function SelectionErrorBanner() {
  const ctx = useInlineCommentReader();
  if (!ctx?.selectionError) {
    return null;
  }

  return (
    <p className="sticky top-14 z-[170] mx-auto mb-3 max-w-lg rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-center text-xs font-semibold text-amber-100">
      {ctx.selectionError}
    </p>
  );
}

function InlineCommentLayerInner({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <SelectionErrorBanner />
      {children}
      <InlineCommentPopover />
      <InlineCommentPanelHost />
      <InlineCommentSheetHost />
    </div>
  );
}

export function InlineCommentLayer({
  chapterId,
  children,
  contentHash,
  currentUserId,
  enabled,
  initialBlockCounts,
  loggedIn,
  returnTo,
  storyId
}: InlineCommentLayerProps) {
  const [blockCounts, setBlockCounts] = useState<Record<string, InlineBlockCommentCounts>>(() =>
    Object.fromEntries(initialBlockCounts.map((entry) => [entry.blockId, entry]))
  );
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [pendingAnchor, setPendingAnchor] = useState<SelectionAnchorPayload | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  useEffect(() => {
    setBlockCounts(Object.fromEntries(initialBlockCounts.map((entry) => [entry.blockId, entry])));
  }, [initialBlockCounts]);

  const refreshBlockCounts = useCallback(async () => {
    const counts = await getInlineCommentCountsAction(chapterId);
    setBlockCounts(Object.fromEntries(counts.map((entry) => [entry.blockId, entry])));
  }, [chapterId]);

  const contextValue = useMemo(
    () => ({
      chapterId,
      storyId,
      contentHash,
      enabled,
      loggedIn,
      returnTo,
      currentUserId,
      blockCounts,
      refreshBlockCounts,
      openThreadId,
      setOpenThreadId,
      activeBlockId,
      setActiveBlockId,
      pendingAnchor,
      setPendingAnchor,
      selectionError,
      setSelectionError
    }),
    [
      activeBlockId,
      blockCounts,
      chapterId,
      contentHash,
      currentUserId,
      enabled,
      loggedIn,
      openThreadId,
      pendingAnchor,
      refreshBlockCounts,
      returnTo,
      selectionError,
      storyId
    ]
  );

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <InlineCommentReaderProvider value={contextValue}>
      <InlineCommentLayerInner>{children}</InlineCommentLayerInner>
    </InlineCommentReaderProvider>
  );
}
