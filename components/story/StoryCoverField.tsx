"use client";

import { useEffect, useMemo, useState } from "react";
import { StoryImageUploader } from "@/components/story/StoryImageUploader";
import { StoryImageVariantWarning } from "@/components/story/StoryImageVariantWarning";
import { resolveStoryCoverPreviewUrl } from "@/lib/images/resolve-story-cover-preview-url";
import type { StoryImage } from "@/types/story-images";

type StoryCoverFieldProps = {
  storyId?: string | null;
  coverUrl?: string | null;
  currentImage?: StoryImage | null;
  disabled?: boolean;
  onCoverChange?: (coverUrl: string | null) => void;
};

function resolveStoredCoverUrl(
  coverUrl?: string | null,
  currentImage?: StoryImage | null
) {
  return (
    coverUrl?.trim() ||
    currentImage?.portraitUrl ||
    currentImage?.originalUrl ||
    null
  );
}

export function StoryCoverField({
  coverUrl,
  currentImage = null,
  disabled = false,
  onCoverChange,
  storyId
}: StoryCoverFieldProps) {
  const [hiddenCoverUrl, setHiddenCoverUrl] = useState(
    resolveStoredCoverUrl(coverUrl, currentImage) ?? ""
  );

  useEffect(() => {
    const next = resolveStoredCoverUrl(coverUrl, currentImage);
    if (next) {
      setHiddenCoverUrl(next);
      onCoverChange?.(next);
    }
  }, [coverUrl, currentImage, onCoverChange]);
  const previewUrl = useMemo(
    () => resolveStoryCoverPreviewUrl(hiddenCoverUrl || coverUrl, currentImage),
    [coverUrl, currentImage, hiddenCoverUrl]
  );

  if (!storyId) {
    return (
      <div className="space-y-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4">
        <p className="text-sm font-medium text-zinc-200">Ảnh bìa truyện</p>
        <p className="text-sm leading-6 text-zinc-500">
          Lưu bản nháp trước, sau đó quay lại chỉnh sửa để tải ảnh bìa từ máy bạn.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-200">Ảnh bìa truyện</p>
      {storyId ? (
        <StoryImageVariantWarning currentImage={currentImage} storyId={storyId} />
      ) : null}
      <StoryImageUploader
        currentImage={currentImage}
        disabled={disabled}
        initialPreviewUrl={previewUrl}
        onUploaded={({ image }) => {
          const next = image.portraitUrl ?? image.originalUrl ?? "";
          setHiddenCoverUrl(next);
          onCoverChange?.(next || null);
        }}
        storageKey={hiddenCoverUrl || coverUrl || ""}
        storyId={storyId}
      />
      <input name="cover_url" type="hidden" value={hiddenCoverUrl} />
    </div>
  );
}
