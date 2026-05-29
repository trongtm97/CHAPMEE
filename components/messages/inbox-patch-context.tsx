"use client";

import { createContext, useContext } from "react";

type InboxPatchContextValue = {
  patchInboxUnread: (conversationId: string) => void;
};

export const InboxPatchContext = createContext<InboxPatchContextValue | null>(null);

export function useInboxPatch() {
  return useContext(InboxPatchContext);
}
