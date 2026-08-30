"use client";

import { ChapterReactions } from "@/components/reader/ChapterReactions";
import type { ChapterReactionsSnapshot } from "@/types/reaction";

type ReaderReactionPanelProps = {
  reaction: ChapterReactionsSnapshot | null;
  loggedIn: boolean;
  returnTo: string;
  chapterId: string;
  storyId: string;
};

/** @deprecated Use ChapterReactions directly. */
export function ReaderReactionPanel({
  chapterId,
  loggedIn,
  reaction,
  returnTo
}: ReaderReactionPanelProps) {
  return (
    <ChapterReactions
      chapterId={chapterId}
      initialSnapshot={reaction}
      loggedIn={loggedIn}
      returnTo={returnTo}
    />
  );
}
