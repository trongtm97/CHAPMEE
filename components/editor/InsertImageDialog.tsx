"use client";

import { useRef, useState } from "react";
import { Button, Textarea } from "@/components/ui";
import { StudioPolicyNotice } from "@/components/studio/StudioPolicyNotice";
import { MediaLibraryDialog } from "@/components/editor/MediaLibraryDialog";
import type { EditorCanvasHandle } from "@/components/editor/EditorCanvas";
import { insertImageBlockIntoContent } from "@/lib/editor/insert-image-block";
import { countImageBlocksInContent } from "@/lib/editor/chapter-image-block";
import { mapStoryImageUploadError } from "@/lib/images/map-upload-error";
import {
  CHAPTER_IMAGE_ACCEPT_ATTRIBUTE,
  CHAPTER_IMAGE_MAX_PER_CHAPTER
} from "@/types/chapter-images";
import type { ChapterImageBlock } from "@/types/chapter-images";
import type { LibraryImage } from "@/types/media-library";

function loadImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ width: 1280, height: 720 });
      return;
    }
    const img = new window.Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth || 1280, height: img.naturalHeight || 720 });
    img.onerror = () => resolve({ width: 1280, height: 720 });
    img.src = url;
  });
}

type InsertImageDialogProps = {
  content: string;
  draftId?: string | null;
  episodeId?: string | null;
  onClose: () => void;
  onInsert: (nextContent: string) => void;
  open: boolean;
  storyId: string;
  textareaRef: React.RefObject<EditorCanvasHandle | null>;
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
  const [showLibrary, setShowLibrary] = useState(false);

  if (!open) {
    return null;
  }

  const imageCount = countImageBlocksInContent(content);
  const atLimit = imageCount >= CHAPTER_IMAGE_MAX_PER_CHAPTER;
  const canUpload = Boolean(episodeId || draftId) && !atLimit;

  function insertBlock(block: ChapterImageBlock) {
    const canvas = textareaRef.current;
    if (canvas?.insertImageBlock) {
      canvas.insertImageBlock(block);
      return;
    }
    const textarea = canvas?.getTextarea();
    const selectionStart = textarea?.selectionStart ?? content.length;
    const selectionEnd = textarea?.selectionEnd ?? content.length;
    onInsert(
      insertImageBlockIntoContent({ block, content, selectionEnd, selectionStart })
    );
  }

  async function handlePickFromLibrary(image: LibraryImage) {
    const dims =
      image.width && image.height
        ? { width: image.width, height: image.height }
        : await loadImageSize(image.url);

    const block: ChapterImageBlock = {
      id: image.id,
      mediaAssetId: image.id,
      src: image.objectKey,
      thumbSrc: image.thumbKey,
      width: dims.width,
      height: dims.height,
      alt: image.alt,
      caption: image.caption,
      align: "center"
    };

    insertBlock(block);
    setShowLibrary(false);
    onClose();
  }

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

      const block: ChapterImageBlock = {
        ...payload.block,
        caption: caption.trim() || payload.block.caption
      };

      const canvas = textareaRef.current;
      if (canvas?.insertImageBlock) {
        canvas.insertImageBlock(block);
        setCaption("");
        setSelectedName(null);
        onClose();
        return;
      }

      const textarea = canvas?.getTextarea();
      const selectionStart = textarea?.selectionStart ?? content.length;
      const selectionEnd = textarea?.selectionEnd ?? content.length;
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
    <>
      {showLibrary ? (
        <MediaLibraryDialog
          onClose={() => setShowLibrary(false)}
          onPick={(image) => void handlePickFromLibrary(image)}
          open={showLibrary}
          title="Ảnh đã tải lên của bạn"
        />
      ) : null}
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

        <StudioPolicyNotice
          note="Ảnh chương nên là ảnh gốc, ảnh AI mới hoặc ảnh bạn có quyền sử dụng."
          title="Quy định ảnh chương"
          items={[
            "Chấp nhận mọi tỉ lệ ảnh (ngang, dọc, vuông).",
            "Không copy 100% từ nguồn khác.",
            "Không chứa chữ tiếng Việt bị lỗi đọc hoặc chữ nước ngoài gây khó đọc.",
            "Nên tạo ảnh mới bằng công cụ AI hoặc chỉnh sửa cho phù hợp người Việt."
          ]}
        />

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

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={!canUpload || processing}
              onClick={() => fileInputRef.current?.click()}
              type="button"
              variant="secondary"
            >
              {processing ? "Đang xử lý ảnh..." : "Chọn ảnh từ máy"}
            </Button>
            <Button
              disabled={atLimit || processing}
              onClick={() => setShowLibrary(true)}
              type="button"
              variant="ghost"
            >
              Dùng lại ảnh đã tải
            </Button>
          </div>

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
    </>
  );
}
