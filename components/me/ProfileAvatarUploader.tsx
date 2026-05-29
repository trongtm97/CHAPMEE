"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarFallback } from "@/components/ui";
import { AvatarCropper } from "@/components/me/AvatarCropper";
import { uploadAvatarAction } from "@/lib/profile/uploadAvatar";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type ProfileAvatarUploaderProps = {
  avatarUrl: string | null;
  displayName: string;
  onAvatarUpdated?: (url: string) => void;
  onToast?: (message: string) => void;
};

export function ProfileAvatarUploader({
  avatarUrl,
  displayName,
  onAvatarUpdated,
  onToast
}: ProfileAvatarUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(avatarUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
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
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCropSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleConfirm(dataUrl: string) {
    setLoading(true);
    setError(null);

    const result = await uploadAvatarAction(dataUrl);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.avatarUrl) {
      setPreviewUrl(result.avatarUrl);
      onAvatarUpdated?.(result.avatarUrl);
      onToast?.("Đã cập nhật ảnh đại diện.");
    }

    setCropSrc(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-2 border-b border-white/6 pb-5">
      <button
        className="group relative rounded-full"
        onClick={openPicker}
        type="button"
      >
        <AvatarFallback
          className="ring-2 ring-cyan-300/15 shadow-[0_10px_28px_rgba(0,0,0,0.2)]"
          name={displayName}
          size="lg"
          src={previewUrl}
        />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[0.65rem] font-semibold text-white opacity-0 transition group-active:opacity-100">
          Đổi ảnh
        </span>
      </button>

      <button
        className="text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
        onClick={openPicker}
        type="button"
      >
        Đổi ảnh đại diện
      </button>

      <p className="text-center text-[0.65rem] text-zinc-500">JPG, PNG hoặc WebP. Tối đa 5MB.</p>

      <input
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />

      {error ? (
        <p className="w-full rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-center text-xs text-red-100">
          {error}
        </p>
      ) : null}

      {cropSrc ? (
        <AvatarCropper
          imageSrc={cropSrc}
          loading={loading}
          onCancel={() => setCropSrc(null)}
          onConfirm={(dataUrl) => void handleConfirm(dataUrl)}
        />
      ) : null}
    </div>
  );
}
