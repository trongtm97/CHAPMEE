"use client";

import { useEffect, useRef, useState } from "react";
import {
  STORY_IMAGE_ACCEPT_ATTRIBUTE,
  STORY_IMAGE_MIN_SIZE_LABEL,
  validateStoryImageDimensions,
  validateStoryImageFileMeta
} from "@/lib/images/validate-image-upload";
import { StudioPolicyNotice } from "@/components/studio/StudioPolicyNotice";

type StoryCreateCoverFieldProps = {
  disabled?: boolean;
  file: File | null;
  onFileChange: (file: File | null) => void;
};

export function StoryCreateCoverField({
  disabled = false,
  file,
  onFileChange
}: StoryCreateCoverFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function openPicker() {
    if (!disabled) {
      inputRef.current?.click();
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) {
      return;
    }
    const metaError = validateStoryImageFileMeta(picked);
    if (metaError) {
      setError(metaError);
      return;
    }

    // Validate dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(picked);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const dimError = validateStoryImageDimensions(img.naturalWidth, img.naturalHeight);
      if (dimError) {
        setError(dimError + ` (${STORY_IMAGE_MIN_SIZE_LABEL})`);
        return;
      }
      setError(null);
      onFileChange(picked);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError("Không thể đọc file ảnh.");
    };
    img.src = objectUrl;
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-bold text-zinc-200">Ảnh bìa</span>
      <input
        accept={STORY_IMAGE_ACCEPT_ATTRIBUTE}
        className="hidden"
        disabled={disabled}
        onChange={handleChange}
        ref={inputRef}
        type="file"
      />
      <div className="flex flex-wrap items-start gap-4">
        <div className="relative h-40 w-28 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/80">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Xem trước ảnh bìa"
              className="h-full w-full object-cover"
              src={previewUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-zinc-500">
              Chưa chọn ảnh
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 disabled:opacity-60"
              disabled={disabled}
              onClick={openPicker}
              type="button"
            >
              {file ? "Đổi ảnh" : "Tải ảnh từ máy"}
            </button>
            {file ? (
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/5 disabled:opacity-60"
                disabled={disabled}
                onClick={() => onFileChange(null)}
                type="button"
              >
                Xóa ảnh
              </button>
            ) : null}
          </div>
          <p className="text-xs leading-5 text-zinc-500">
            JPG, PNG hoặc WebP · tối đa 8MB · {STORY_IMAGE_MIN_SIZE_LABEL}. Ảnh sẽ
            được tải lên khi bạn lưu hoặc tạo truyện.
          </p>
          <StudioPolicyNotice
            note="Dùng ảnh gốc do bạn tạo, ảnh AI mới hoặc ảnh bạn có quyền sử dụng."
            title="Quy định ảnh bìa truyện"
            items={[
              "Tỉ lệ 3:4.",
              "Không copy 100% từ nguồn khác.",
              "Không chứa chữ tiếng Việt bị lỗi đọc hoặc chữ nước ngoài gây khó đọc.",
              "Nên tạo ảnh mới bằng công cụ AI hoặc chỉnh sửa để phù hợp người Việt."
            ]}
          />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
