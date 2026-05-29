"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FocalPointPicker } from "@/components/story/FocalPointPicker";
import { StoryImageVariantPreview } from "@/components/story/StoryImageVariantPreview";
import type { FocalPoint } from "@/lib/images/crop-with-focal-point";
import {
  DEFAULT_FOCAL_POINT,
  normalizeFocalPoint
} from "@/lib/images/parse-focal-point";
import { mapStoryImageUploadError } from "@/lib/images/map-upload-error";
import {
  STORY_IMAGE_ACCEPT_ATTRIBUTE,
  STORY_IMAGE_ERROR,
  STORY_IMAGE_MIN_HEIGHT,
  STORY_IMAGE_MIN_WIDTH,
  validateStoryImageFileMeta
} from "@/lib/images/validate-image-upload";
import type { StoryImage } from "@/types/story-images";

type StoryImageUploaderProps = {
  storyId: string;
  initialPreviewUrl?: string | null;
  disabled?: boolean;
  onUploaded?: (payload: { image: StoryImage; coverUrl: string }) => void;
};

type Step = "idle" | "adjust" | "uploading";

function loadImageFromFile(file: File) {
  return new Promise<{ url: string; width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        url,
        width: image.naturalWidth,
        height: image.naturalHeight
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(STORY_IMAGE_ERROR.invalidFile));
    };

    image.src = url;
  });
}

export function StoryImageUploader({
  disabled = false,
  initialPreviewUrl,
  onUploaded,
  storyId
}: StoryImageUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const localUrlRef = useRef<string | null>(null);

  const [step, setStep] = useState<Step>("idle");
  const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl ?? null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [focal, setFocal] = useState<FocalPoint>(DEFAULT_FOCAL_POINT);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localUrlRef.current) {
        URL.revokeObjectURL(localUrlRef.current);
      }
    };
  }, []);

  function revokeLocalPreview() {
    if (localUrlRef.current) {
      URL.revokeObjectURL(localUrlRef.current);
      localUrlRef.current = null;
    }
    setLocalPreviewUrl(null);
  }

  function resetAdjustment() {
    revokeLocalPreview();
    setPendingFile(null);
    setFocal(DEFAULT_FOCAL_POINT);
    setStep("idle");
  }

  function openPicker() {
    if (disabled || step === "uploading") {
      return;
    }
    inputRef.current?.click();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const metaError = validateStoryImageFileMeta(file);
    if (metaError) {
      setError(metaError);
      return;
    }

    setError(null);

    try {
      const loaded = await loadImageFromFile(file);

      if (
        loaded.width < STORY_IMAGE_MIN_WIDTH ||
        loaded.height < STORY_IMAGE_MIN_HEIGHT
      ) {
        URL.revokeObjectURL(loaded.url);
        setError(STORY_IMAGE_ERROR.tooSmall);
        return;
      }

      revokeLocalPreview();
      localUrlRef.current = loaded.url;
      setLocalPreviewUrl(loaded.url);
      setPendingFile(file);
      setFocal(DEFAULT_FOCAL_POINT);
      setStep("adjust");
    } catch {
      setError(STORY_IMAGE_ERROR.invalidFile);
    }
  }

  async function handleConfirm() {
    if (!pendingFile || step !== "adjust") {
      return;
    }

    setError(null);
    setStep("uploading");

    const normalizedFocal = normalizeFocalPoint(focal);

    try {
      const body = new FormData();
      body.append("storyId", storyId);
      body.append("file", pendingFile);
      body.append("focalX", String(normalizedFocal.x));
      body.append("focalY", String(normalizedFocal.y));

      const response = await fetch("/api/story-images/upload", {
        body,
        method: "POST"
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        image?: StoryImage;
        coverUrl?: string;
      } | null;

      if (!response.ok) {
        setError(mapStoryImageUploadError(payload?.error, response.status));
        setStep("adjust");
        return;
      }

      if (!payload?.image || !payload.coverUrl) {
        setError("Không thể lưu ảnh bìa. Vui lòng thử lại.");
        setStep("adjust");
        return;
      }

      setPreviewUrl(payload.coverUrl);
      onUploaded?.({ coverUrl: payload.coverUrl, image: payload.image });
      resetAdjustment();
      setStep("idle");
      router.refresh();
    } catch (uploadError) {
      const isNetwork =
        uploadError instanceof TypeError &&
        /fetch|network/i.test(uploadError.message);

      setError(
        isNetwork
          ? "Mất kết nối khi tải ảnh. Kiểm tra mạng và thử lại."
          : "Không thể tải ảnh lên. Vui lòng thử lại."
      );
      setStep("adjust");
    }
  }

  const isUploading = step === "uploading";
  const isAdjusting = step === "adjust" && localPreviewUrl;

  return (
    <div className="space-y-3">
      <input
        accept={STORY_IMAGE_ACCEPT_ATTRIBUTE}
        className="hidden"
        disabled={disabled || isUploading}
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />

      {isAdjusting ? (
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
          <FocalPointPicker
            disabled={isUploading}
            focal={focal}
            imageUrl={localPreviewUrl}
            onFocalChange={setFocal}
          />

          <StoryImageVariantPreview focal={focal} imageUrl={localPreviewUrl} />

          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
              disabled={disabled || isUploading}
              onClick={handleConfirm}
              type="button"
            >
              {isUploading ? "Đang xử lý ảnh..." : "Xác nhận ảnh"}
            </button>
            <button
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
              disabled={isUploading}
              onClick={resetAdjustment}
              type="button"
            >
              Chọn ảnh khác
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-4">
          <div className="relative h-36 w-28 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/80">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Xem trước ảnh bìa"
                className="h-full w-full object-cover"
                src={previewUrl}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-2 text-center text-xs text-zinc-500">
                Chưa có ảnh bìa
              </div>
            )}
            {isUploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-semibold text-white">
                Đang xử lý ảnh...
              </div>
            ) : null}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled || isUploading}
              onClick={openPicker}
              type="button"
            >
              Tải ảnh bìa
            </button>
            <p className="text-xs leading-5 text-zinc-500">
              JPG, PNG hoặc WebP · tối đa 8MB · tối thiểu 600×600px. Sau khi chọn ảnh, bạn
              sẽ chọn vùng quan trọng trước khi xác nhận.
            </p>
          </div>
        </div>
      )}

      {error ? (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
