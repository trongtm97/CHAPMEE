"use client";

import { useRef, useState } from "react";
import { Button, Input } from "@/components/ui";
import { mapStoryImageUploadError } from "@/lib/images/map-upload-error";
import {
  CHAPTER_IMAGE_ACCEPT_ATTRIBUTE,
  CHAPTER_IMAGE_MAX_PER_CHAPTER
} from "@/types/chapter-images";

type ComposerImageUploadProps = {
  alt: string;
  caption: string;
  disabled?: boolean;
  draftId?: string | null;
  episodeId?: string | null;
  mediaId: string;
  onChange: (patch: { media_id: string; alt: string; caption: string }) => void;
  storyId: string;
};

export function ComposerImageUpload({
  alt,
  caption,
  disabled,
  draftId,
  episodeId,
  mediaId,
  onChange,
  storyId
}: ComposerImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const canUpload = Boolean(episodeId || draftId);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!canUpload) {
      setError("Đang lưu nháp… Đợi vài giây rồi tải ảnh lại.");
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      const formData = new FormData();
      formData.set("storyId", storyId);
      formData.set("file", file);
      formData.set("altText", alt);
      formData.set("caption", caption);
      formData.set("content", "");

      if (episodeId) {
        formData.set("episodeId", episodeId);
      }
      if (draftId) {
        formData.set("draftId", draftId);
      }

      const response = await fetch("/api/chapter-images/upload", {
        body: formData,
        method: "POST"
      });

      const payload = (await response.json()) as {
        block?: { id: string; alt: string; caption: string };
        error?: string;
      };

      if (!response.ok || !payload.block) {
        setError(
          mapStoryImageUploadError(payload.error, response.status) ??
            "Không thể tải ảnh lên."
        );
        return;
      }

      onChange({
        media_id: payload.block.id,
        alt: alt.trim() || payload.block.alt,
        caption: caption.trim() || payload.block.caption
      });
    } catch {
      setError("Mất kết nối khi tải ảnh.");
    } finally {
      setProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-2">
      {mediaId ? (
        <p className="text-xs text-emerald-300/90">
          Đã gắn ảnh nội bộ: <code className="rounded bg-black/30 px-1">{mediaId}</code>
        </p>
      ) : (
        <p className="text-xs text-zinc-500">Chưa có ảnh. Tải lên từ máy (không dùng URL ngoài).</p>
      )}
      <input
        accept={CHAPTER_IMAGE_ACCEPT_ATTRIBUTE}
        className="sr-only"
        disabled={disabled || !canUpload || processing}
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />
      <Button
        disabled={disabled || !canUpload || processing}
        onClick={() => fileInputRef.current?.click()}
        type="button"
        variant="secondary"
      >
        {processing ? "Đang tải..." : mediaId ? "Đổi ảnh" : "Tải ảnh lên"}
      </Button>
      <Input
        disabled={disabled}
        label="Alt"
        onChange={(e) => onChange({ media_id: mediaId, alt: e.target.value, caption })}
        value={alt}
      />
      <Input
        disabled={disabled}
        label="Chú thích"
        onChange={(e) => onChange({ media_id: mediaId, alt, caption: e.target.value })}
        value={caption}
      />
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      <p className="text-[0.65rem] text-zinc-600">
        Tối đa {CHAPTER_IMAGE_MAX_PER_CHAPTER} ảnh/chương · JPG, PNG, WebP
      </p>
    </div>
  );
}
