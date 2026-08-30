"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { InlineBlockCommentCounts } from "@/types/inline-comment";
import type { SelectionAnchorPayload } from "@/lib/inline-comments/text-offset";

export type InlineCommentReaderContextValue = {
  chapterId: string;
  storyId: string;
  contentHash: string | null;
  enabled: boolean;
  loggedIn: boolean;
  returnTo: string;
  currentUserId: string | null;
  blockCounts: Record<string, InlineBlockCommentCounts>;
  refreshBlockCounts: () => void;
  openThreadId: string | null;
  setOpenThreadId: (threadId: string | null) => void;
  activeBlockId: string | null;
  setActiveBlockId: (blockId: string | null) => void;
  pendingAnchor: SelectionAnchorPayload | null;
  setPendingAnchor: (anchor: SelectionAnchorPayload | null) => void;
  selectionError: string | null;
  setSelectionError: (message: string | null) => void;
};

export const InlineCommentReaderContext = createContext<InlineCommentReaderContextValue | null>(
  null
);

export function useInlineCommentReader() {
  return useContext(InlineCommentReaderContext);
}

export function InlineCommentReaderProvider({
  children,
  value
}: {
  value: InlineCommentReaderContextValue;
  children: ReactNode;
}) {
  return (
    <InlineCommentReaderContext.Provider value={value}>
      {children}
    </InlineCommentReaderContext.Provider>
  );
}
