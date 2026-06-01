"use client";

import { useRef, useState } from "react";
import { uploadContentPostCoverAction } from "@/lib/platform-content/upload-cover";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type Props = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
};

export function ContentPostCoverUploader({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function openPicker() {
    inputRef.current?.click();
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

      if (!result.ok || !result.url) {
        setError(result.message ?? "Không thể tải ảnh lên.");
        return;
      }

      onChange(result.url);
    };
    reader.onerror = () => {
      setLoading(false);
      setError("Không thể đọc file ảnh.");
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <div className="flex h-28 w-44 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-full w-full object-cover" src={value} />
          ) : (
            <span className="text-xs text-zinc-500">Chưa có ảnh bìa</span>
          )}
        </div>

        <div className="space-y-2">
          <button
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:opacity-60"
            disabled={disabled || loading}
            onClick={openPicker}
            type="button"
          >
            {loading ? "Đang tải lên…" : "Chọn ảnh bìa"}
          </button>
          {value ? (
            <button
              className="block text-xs text-zinc-400 transition hover:text-zinc-200"
              disabled={disabled || loading}
              onClick={() => onChange("")}
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
    </div>
  );
}
