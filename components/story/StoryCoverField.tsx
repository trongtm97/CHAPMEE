"use client";

import { useState } from "react";
import { StoryImageUploader } from "@/components/story/StoryImageUploader";
import { StoryImageVariantWarning } from "@/components/story/StoryImageVariantWarning";
import type { StoryImage } from "@/types/story-images";

type StoryCoverFieldProps = {
  storyId?: string | null;
  coverUrl?: string | null;
  currentImage?: StoryImage | null;
  disabled?: boolean;
};

export function StoryCoverField({
  coverUrl,
  currentImage = null,
  disabled = false,
  storyId
}: StoryCoverFieldProps) {
  const [hiddenCoverUrl, setHiddenCoverUrl] = useState(coverUrl ?? "");

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
        disabled={disabled}
        initialPreviewUrl={hiddenCoverUrl || coverUrl}
        onUploaded={({ coverUrl: nextCoverUrl }) => {
          setHiddenCoverUrl(nextCoverUrl);
        }}
        storyId={storyId}
      />
      <input name="cover_url" type="hidden" value={hiddenCoverUrl} />
    </div>
  );
}
