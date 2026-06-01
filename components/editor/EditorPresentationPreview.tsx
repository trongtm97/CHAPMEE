"use client";

import { useMemo } from "react";
import { ChapMeeBlockRenderer } from "@/components/composer/renderers/ChapMeeBlockRenderer";
import { collectMediaIdsFromComposer } from "@/lib/composer/collect-media-ids";
import { isComposerStructuredDocument } from "@/lib/composer/serializer";
import { useChapterImagesMap } from "@/hooks/useChapterImagesMap";
import { ReaderPreferencesProvider } from "@/components/reader/ReaderPreferencesProvider";
import type { PresentationMode } from "@/types/presentation";

type EditorPresentationPreviewProps = {
  authorNote?: string | null;
  chapterNumber: number;
  content: string;
  storyTitle: string;
  title: string;
  presentationMode: PresentationMode;
  structuredContent: unknown | null;
};

export function EditorPresentationPreview({
  authorNote,
  chapterNumber,
  content,
  presentationMode,
  storyTitle,
  structuredContent,
  title
}: EditorPresentationPreviewProps) {
  const mediaIds = useMemo(
    () => collectMediaIdsFromComposer(structuredContent),
    [structuredContent]
  );
  const { imageMap, loading } = useChapterImagesMap(mediaIds);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1018] p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[42rem]">
        <header className="min-w-0 space-y-1.5 border-b border-white/10 pb-4">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-cyan-200/85">
            Chương {chapterNumber}
          </p>
          <h1
            className="line-clamp-3 text-xl font-bold leading-snug text-white sm:text-[1.35rem]"
            title={title}
          >
            {title.trim() || "Tiêu đề chương"}
          </h1>
          <p className="truncate text-sm text-zinc-400" title={storyTitle}>
            {storyTitle}
          </p>
        </header>

        <div className="pt-6">
          {loading ? (
            <p className="mb-3 text-center text-xs text-zinc-500">Đang tải ảnh minh họa…</p>
          ) : null}
          <ReaderPreferencesProvider>
            <ChapMeeBlockRenderer
              chapterImageMap={imageMap}
              chapterMode={null}
              contentFormat={
                structuredContent && isComposerStructuredDocument(structuredContent)
                  ? "structured_blocks"
                  : structuredContent
                    ? "structured_json"
                    : null
              }
              context="preview"
              fallbackContent={content}
              mode={presentationMode}
              showFallbackNotice
              storyMode={presentationMode}
              structuredContent={structuredContent}
            />
          </ReaderPreferencesProvider>
        </div>

        {authorNote?.trim() ? (
          <footer className="mt-8 border-t border-white/10 pt-4 text-sm italic text-zinc-400">
            {authorNote.trim()}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
