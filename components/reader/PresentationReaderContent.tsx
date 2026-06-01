"use client";

import { ChapMeeBlockRenderer } from "@/components/composer/renderers/ChapMeeBlockRenderer";
import type { ChapterImageMap } from "@/lib/images/get-chapter-images-map";
import type { PresentationMode } from "@/types/presentation";

type PresentationReaderContentProps = {
  mode: PresentationMode;
  storyMode?: string | null;
  chapterMode?: string | null;
  content: string;
  structuredContent: unknown | null;
  contentFormat?: string | null;
  chapterImageMap?: ChapterImageMap;
};

export function PresentationReaderContent({
  chapterImageMap = {},
  chapterMode,
  content,
  contentFormat = null,
  mode,
  storyMode,
  structuredContent
}: PresentationReaderContentProps) {
  return (
    <ChapMeeBlockRenderer
      chapterImageMap={chapterImageMap}
      chapterMode={chapterMode}
      contentFormat={contentFormat}
      context="public"
      fallbackContent={content}
      mode={mode}
      storyMode={storyMode}
      structuredContent={structuredContent}
    />
  );
}
