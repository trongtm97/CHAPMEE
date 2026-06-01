"use client";

import { useMemo } from "react";
import { ChapMeeBlockRenderer } from "@/components/composer/renderers/ChapMeeBlockRenderer";
import { collectMediaIdsFromComposer } from "@/lib/composer/collect-media-ids";
import { COMPOSER_MODE_LABELS } from "@/lib/composer/modes";
import type { ComposerMode, ComposerStructuredContent } from "@/lib/composer/types";
import { useChapterImagesMap } from "@/hooks/useChapterImagesMap";
import { Button } from "@/components/ui";
import { ReaderPreferencesProvider } from "@/components/reader/ReaderPreferencesProvider";

type ComposerMobilePreviewProps = {
  fallbackContent: string;
  mode: ComposerMode;
  onClose: () => void;
  open: boolean;
  value: ComposerStructuredContent;
};

export function ComposerMobilePreview({
  fallbackContent,
  mode,
  onClose,
  open,
  value
}: ComposerMobilePreviewProps) {
  const mediaIds = useMemo(() => collectMediaIdsFromComposer(value), [value]);
  const { imageMap, loading } = useChapterImagesMap(mediaIds);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            Xem trước trên điện thoại
          </p>
          <p className="text-sm font-semibold text-white">
            {COMPOSER_MODE_LABELS[mode]}
          </p>
        </div>
        <Button onClick={onClose} type="button" variant="secondary">
          Đóng
        </Button>
      </header>
      <div className="flex flex-1 justify-center overflow-y-auto bg-zinc-900 p-4">
        <div className="w-full max-w-[390px] rounded-[2rem] border border-zinc-700 bg-[#0b1018] p-4 shadow-2xl">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-zinc-700" />
          {loading ? (
            <p className="text-center text-sm text-zinc-500">Đang tải ảnh minh họa…</p>
          ) : null}
          <ReaderPreferencesProvider>
            <ChapMeeBlockRenderer
              chapterImageMap={imageMap}
              contentFormat="structured_blocks"
              context="preview"
              fallbackContent={fallbackContent}
              mode={mode}
              showFallbackNotice
              structuredContent={value}
            />
          </ReaderPreferencesProvider>
        </div>
      </div>
    </div>
  );
}
