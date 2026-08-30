"use client";

import { useEffect, useState, useTransition } from "react";
import { getMediaAssetPreviewAction } from "@/lib/admin/seo-center-actions";
import { uploadFileViaMediaPresign } from "@/lib/media/client-presign-upload";
import { MediaLibraryDialog } from "@/components/editor/MediaLibraryDialog";
import { Button } from "@/components/ui";

type SeoMediaAssetFieldProps = {
  label: string;
  name: string;
  value: string | null;
  onChange: (assetId: string | null) => void;
  disabled?: boolean;
  hint?: string;
};

export function SeoMediaAssetField({
  label,
  name,
  value,
  onChange,
  disabled,
  hint
}: SeoMediaAssetFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }

    startTransition(async () => {
      const result = await getMediaAssetPreviewAction(value);
      setPreviewUrl(result.url);
    });
  }, [value]);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const result = await uploadFileViaMediaPresign({
          file,
          purpose: "seo_og",
          linkedEntityType: "seo_settings"
        });
        onChange(result.mediaAsset.id);
        setPreviewUrl(result.resolvedUrl);
      } catch (uploadError) {
        setError(
          uploadError instanceof Error ? uploadError.message : "Upload thất bại."
        );
      } finally {
        event.target.value = "";
      }
    });
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-300">{label}</label>
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}

      <input name={name} type="hidden" value={value ?? ""} />

      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer">
          <span className="inline-flex rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-cyan-400/30">
            {pending ? "Đang upload…" : "Upload ảnh OG"}
          </span>
          <input
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            disabled={disabled || pending}
            onChange={onFileChange}
            type="file"
          />
        </label>

        <Button
          disabled={disabled || pending}
          onClick={() => setShowLibrary(true)}
          type="button"
          variant="secondary"
        >
          Chọn từ thư viện
        </Button>

        {value ? (
          <Button
            disabled={disabled || pending}
            onClick={() => onChange(null)}
            type="button"
            variant="secondary"
          >
            Xóa ảnh
          </Button>
        ) : null}
      </div>

      {value ? (
        <p className="font-mono text-xs text-zinc-500">media_asset_id: {value}</p>
      ) : (
        <p className="text-xs text-zinc-500">Chọn ảnh qua media system — không dùng URL local.</p>
      )}

      {previewUrl ? (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="max-h-40 w-full object-cover" src={previewUrl} />
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <MediaLibraryDialog
        accept="image/jpeg,image/png,image/webp,image/avif"
        filterSource="asset"
        onClose={() => setShowLibrary(false)}
        onPick={(image) => {
          onChange(image.id);
          setPreviewUrl(image.url);
          setShowLibrary(false);
        }}
        open={showLibrary}
        title="Chọn ảnh OG từ thư viện"
        uploadHint="Ảnh đã tải trước đây của bạn có thể tái sử dụng cho SEO."
        uploadFile={async (file) => {
          try {
            const result = await uploadFileViaMediaPresign({
              file,
              purpose: "seo_og",
              linkedEntityType: "seo_settings"
            });
            return {
              ok: true as const,
              image: {
                id: result.mediaAsset.id,
                source: "asset" as const,
                url: result.resolvedUrl ?? "",
                objectKey: result.resolvedUrl ?? "",
                thumbUrl: result.resolvedUrl ?? "",
                thumbKey: result.resolvedUrl ?? "",
                width: null,
                height: null,
                alt: "",
                caption: "",
                createdAt: new Date().toISOString()
              }
            };
          } catch (uploadError) {
            return {
              ok: false as const,
              message:
                uploadError instanceof Error ? uploadError.message : "Upload thất bại."
            };
          }
        }}
      />
    </div>
  );
}
