"use client";

import { useRef, useState } from "react";
import { uploadContentPostCoverAction } from "@/lib/platform-content/upload-cover";
import { MediaLibraryDialog } from "@/components/editor/MediaLibraryDialog";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type ContentPostCoverValue = {
  mediaAssetId: string | null;
  previewUrl: string | null;
};

type Props = {
  value: ContentPostCoverValue;
  onChange: (value: ContentPostCoverValue) => void;
  disabled?: boolean;
};

export function ContentPostCoverUploader({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  function openPicker() {
    inputRef.current?.click();
  }

  async function uploadCoverFile(
    file: File
  ): Promise<{ ok: true; mediaAssetId: string; previewUrl: string | null } | { ok: false; message: string }> {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return { ok: false, message: "Định dạng ảnh không được hỗ trợ." };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { ok: false, message: "Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB." };
    }

    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

    if (!dataUrl) {
      return { ok: false, message: "Không thể đọc file ảnh." };
    }

    const result = await uploadContentPostCoverAction(dataUrl);
    if (!result.ok || !result.mediaAssetId) {
      return { ok: false, message: result.message ?? "Không thể tải ảnh lên." };
    }
    return { ok: true, mediaAssetId: result.mediaAssetId, previewUrl: result.previewUrl };
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Định dạng ảnh không được hỗ trợ.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setError("Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB.");
      return;
    }

    setError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== "string") {
        setLoading(false);
        return;
      }

      const result = await uploadContentPostCoverAction(reader.result);
      setLoading(false);

      if (!result.ok || !result.mediaAssetId) {
        setError(result.message ?? "Không thể tải ảnh lên.");
        return;
      }

      onChange({
        mediaAssetId: result.mediaAssetId,
        previewUrl: result.previewUrl
      });
    };
    reader.onerror = () => {
      setLoading(false);
      setError("Không thể đọc file ảnh.");
    };
    reader.readAsDataURL(file);
  }

  const preview = value.previewUrl;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <div className="flex h-28 w-44 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-full w-full object-cover" src={preview} />
          ) : (
            <span className="text-xs text-zinc-500">Chưa có ảnh bìa</span>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:opacity-60"
              disabled={disabled || loading}
              onClick={openPicker}
              type="button"
            >
              {loading ? "Đang tải lên…" : "Chọn ảnh bìa"}
            </button>
            <button
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-cyan-400/30 disabled:opacity-60"
              disabled={disabled || loading}
              onClick={() => setShowLibrary(true)}
              type="button"
            >
              Chọn từ thư viện
            </button>
          </div>
          {value.mediaAssetId ? (
            <button
              className="block text-xs text-zinc-400 transition hover:text-zinc-200"
              disabled={disabled || loading}
              onClick={() => onChange({ mediaAssetId: null, previewUrl: null })}
              type="button"
            >
              Gỡ ảnh bìa
            </button>
          ) : null}
          <p className="text-xs text-zinc-500">JPG, PNG hoặc WebP. Tối đa 5MB.</p>
        </div>
      </div>

      <input
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled || loading}
        onChange={(event) => void handleFileChange(event)}
        ref={inputRef}
        type="file"
      />

      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-100">
          {error}
        </p>
      ) : null}

      <MediaLibraryDialog
        accept="image/jpeg,image/png,image/webp"
        filterSource="asset"
        onClose={() => setShowLibrary(false)}
        onPick={(image) => {
          onChange({ mediaAssetId: image.id, previewUrl: image.url });
          setShowLibrary(false);
        }}
        open={showLibrary}
        title="Chọn ảnh bìa từ thư viện"
        uploadHint="Ảnh đã tải trước đây của bạn có thể tái sử dụng làm ảnh bìa."
        uploadFile={async (file) => {
          const result = await uploadCoverFile(file);
          if (!result.ok) {
            return { ok: false as const, message: result.message };
          }
          return {
            ok: true as const,
            image: {
              id: result.mediaAssetId,
              source: "asset" as const,
              url: result.previewUrl ?? "",
              objectKey: result.previewUrl ?? "",
              thumbUrl: result.previewUrl ?? "",
              thumbKey: result.previewUrl ?? "",
              width: null,
              height: null,
              alt: "",
              caption: "",
              createdAt: new Date().toISOString()
            }
          };
        }}
      />
    </div>
  );
}
