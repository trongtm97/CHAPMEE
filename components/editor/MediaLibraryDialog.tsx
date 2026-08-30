"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import type { LibraryImage } from "@/types/media-library";

type UploadResult = { ok: boolean; image?: LibraryImage; message?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (image: LibraryImage) => void;
  uploadFile?: (file: File) => Promise<UploadResult>;
  accept?: string;
  title?: string;
  uploadHint?: string;
  uploadDisabled?: boolean;
  uploadDisabledReason?: string;
  /** Only show images from this source (e.g. "asset" for media-asset-id pickers). */
  filterSource?: "asset" | "chapter";
};

type Tab = "library" | "upload";

export function MediaLibraryDialog({
  open,
  onClose,
  onPick,
  uploadFile,
  accept = "image/jpeg,image/png,image/webp",
  title = "Thư viện ảnh",
  uploadHint,
  uploadDisabled,
  uploadDisabledReason,
  filterSource
}: Props) {
  const [tab, setTab] = useState<Tab>("library");
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/media/library", { cache: "no-store" });
      const payload = (await response.json()) as { images?: LibraryImage[]; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Không thể tải thư viện ảnh.");
        return;
      }
      setImages(payload.images ?? []);
    } catch {
      setError("Mất kết nối khi tải thư viện ảnh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setTab("library");
      void loadLibrary();
    }
  }, [open, loadLibrary]);

  if (!open) {
    return null;
  }

  const visibleImages = filterSource
    ? images.filter((image) => image.source === filterSource)
    : images;

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !uploadFile) {
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFile(file);
      if (!result.ok) {
        setError(result.message ?? "Không thể tải ảnh lên.");
        return;
      }
      if (result.image) {
        onPick(result.image);
        onClose();
      } else {
        await loadLibrary();
        setTab("library");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={onClose}
      role="dialog"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 border-b border-white/10 px-4 py-2">
          <button
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === "library" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
            onClick={() => setTab("library")}
            type="button"
          >
            Thư viện
          </button>
          {uploadFile ? (
            <button
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === "upload" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200"
              }`}
              onClick={() => setTab("upload")}
              type="button"
            >
              Tải lên
            </button>
          ) : null}
          <div className="ml-auto">
            <button
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
              disabled={loading}
              onClick={() => void loadLibrary()}
              type="button"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Làm mới
            </button>
          </div>
        </div>

        <div className="min-h-[280px] flex-1 overflow-y-auto p-4">
          {error ? (
            <p className="mb-3 rounded-lg border border-rose-400/30 bg-rose-400/10 p-2 text-sm text-rose-100">
              {error}
            </p>
          ) : null}

          {tab === "library" ? (
            loading ? (
              <div className="flex h-48 items-center justify-center text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : visibleImages.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-sm text-zinc-500">
                <ImagePlus className="h-8 w-8 opacity-50" />
                Chưa có ảnh nào. Hãy tải ảnh lên để dùng lại sau này.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {visibleImages.map((image) => (
                  <button
                    className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-black/30 transition hover:border-cyan-400/60"
                    key={`${image.source}-${image.id}`}
                    onClick={() => {
                      onPick(image);
                      onClose();
                    }}
                    title={image.alt || image.caption || ""}
                    type="button"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={image.alt || "Ảnh đã tải lên"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      src={image.thumbUrl}
                    />
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <input
                accept={accept}
                className="sr-only"
                disabled={uploading || uploadDisabled}
                onChange={handleUpload}
                ref={fileInputRef}
                type="file"
              />
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                disabled={uploading || uploadDisabled}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {uploading ? "Đang tải lên…" : "Chọn ảnh từ máy"}
              </button>
              {uploadDisabled && uploadDisabledReason ? (
                <p className="text-xs text-amber-300">{uploadDisabledReason}</p>
              ) : uploadHint ? (
                <p className="max-w-sm text-center text-xs text-zinc-500">{uploadHint}</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
