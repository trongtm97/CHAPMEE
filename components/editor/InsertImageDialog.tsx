"use client";

import { useRef, useState } from "react";
import { Button, Textarea } from "@/components/ui";
import { insertImageBlockIntoContent } from "@/lib/editor/insert-image-block";
import { countImageBlocksInContent } from "@/lib/editor/chapter-image-block";
import { mapStoryImageUploadError } from "@/lib/images/map-upload-error";
import {
  CHAPTER_IMAGE_ACCEPT_ATTRIBUTE,
  CHAPTER_IMAGE_MAX_PER_CHAPTER
} from "@/types/chapter-images";
import type { ChapterImageBlock } from "@/types/chapter-images";

type InsertImageDialogProps = {
  content: string;
  draftId?: string | null;
  episodeId?: string | null;
  onClose: () => void;
  onInsert: (nextContent: string) => void;
  open: boolean;
  storyId: string;
  textareaRef: React.RefObject<{ getTextarea: () => HTMLTextAreaElement | null } | null>;
};

export function InsertImageDialog({
  content,
  draftId,
  episodeId,
  onClose,
  onInsert,
  open,
  storyId,
  textareaRef
}: InsertImageDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const imageCount = countImageBlocksInContent(content);
  const atLimit = imageCount >= CHAPTER_IMAGE_MAX_PER_CHAPTER;
  const canUpload = Boolean(episodeId || draftId) && !atLimit;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!canUpload) {
      setError(
        atLimit
          ? "Bạn đã đạt giới hạn ảnh trong chương này."
          : "Đang lưu nháp… Vui lòng đợi vài giây rồi thử chèn ảnh lại."
      );
      return;
    }

    setSelectedName(file.name);
    setError(null);
    setProcessing(true);

    try {
      const formData = new FormData();
      formData.set("storyId", storyId);
      formData.set("file", file);
      formData.set("caption", caption);
      formData.set("content", content);

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
        block?: ChapterImageBlock;
        error?: string;
      };

      if (!response.ok || !payload.block) {
        setError(
          mapStoryImageUploadError(payload.error, response.status) ??
            "Không thể tải ảnh lên."
        );
        return;
      }

      const textarea = textareaRef.current?.getTextarea();
      const selectionStart = textarea?.selectionStart ?? content.length;
      const selectionEnd = textarea?.selectionEnd ?? content.length;
      const block: ChapterImageBlock = {
        ...payload.block,
        caption: caption.trim() || payload.block.caption
      };

      const nextContent = insertImageBlockIntoContent({
        block,
        content,
        selectionEnd,
        selectionStart
      });

      onInsert(nextContent);
      setCaption("");
      setSelectedName(null);
      onClose();
    } catch {
      setError("Mất kết nối khi tải ảnh. Kiểm tra mạng và thử lại.");
    } finally {
      setProcessing(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-zinc-950 p-4 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Chèn ảnh</h2>
          <button
            className="text-sm text-zinc-400 hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>

        <p className="mb-3 text-xs text-zinc-500">
          {imageCount}/{CHAPTER_IMAGE_MAX_PER_CHAPTER} ảnh trong chương · JPG, PNG, WebP ·
          tối đa 5MB
        </p>

        <div className="space-y-3">
          <Textarea
            disabled={processing}
            label="Chú thích"
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Chú thích hiển thị dưới ảnh (tuỳ chọn)"
            rows={2}
            value={caption}
          />

          <input
            accept={CHAPTER_IMAGE_ACCEPT_ATTRIBUTE}
            className="sr-only"
            disabled={!canUpload || processing}
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />

          <Button
            disabled={!canUpload || processing}
            onClick={() => fileInputRef.current?.click()}
            type="button"
            variant="secondary"
          >
            {processing ? "Đang xử lý ảnh..." : "Chọn ảnh từ máy"}
          </Button>

          {selectedName ? (
            <p className="truncate text-xs text-zinc-400">{selectedName}</p>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
