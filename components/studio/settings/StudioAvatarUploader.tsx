"use client";

import { useRef, useState } from "react";
import { AvatarCropper } from "@/components/me/AvatarCropper";
import { AvatarFallback, Button } from "@/components/ui";
import { clearAvatarAction, uploadAvatarAction } from "@/lib/profile/uploadAvatar";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type StudioAvatarUploaderProps = {
  avatarUrl: string;
  displayName: string;
  disabled?: boolean;
  onAvatarChange: (url: string) => void;
  onError?: (message: string) => void;
};

export function StudioAvatarUploader({
  avatarUrl,
  disabled,
  onAvatarChange,
  onError,
  displayName
}: StudioAvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function openPicker() {
    if (!disabled) {
      inputRef.current?.click();
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      const message = "Định dạng ảnh không được hỗ trợ. Chọn JPG, PNG hoặc WebP.";
      setLocalError(message);
      onError?.(message);
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      const message = "Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB.";
      setLocalError(message);
      onError?.(message);
      return;
    }

    setLocalError(null);
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
    setLocalError(null);

    const result = await uploadAvatarAction(dataUrl);
    setLoading(false);

    if (result.error) {
      setLocalError(result.error);
      onError?.(result.error);
      return;
    }

    if (result.avatarUrl) {
      onAvatarChange(result.avatarUrl);
    }

    setCropSrc(null);
  }

  async function handleClearAvatar() {
    setLoading(true);
    setLocalError(null);

    const result = await clearAvatarAction();
    setLoading(false);

    if (result.error) {
      setLocalError(result.error);
      onError?.(result.error);
      return;
    }

    onAvatarChange("");
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-zinc-200">Ảnh đại diện</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <AvatarFallback
          className="ring-2 ring-cyan-300/15"
          name={displayName || "Tác giả"}
          size="lg"
          src={avatarUrl || null}
        />
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-10" disabled={disabled || loading} onClick={openPicker} type="button">
            Chọn ảnh đại diện
          </Button>
          <Button
            className="min-h-10"
            disabled={disabled || loading || !avatarUrl}
            onClick={() => void handleClearAvatar()}
            type="button"
            variant="secondary"
          >
            Dùng ảnh mặc định
          </Button>
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        JPG, PNG hoặc WebP · tối đa 5MB · ảnh vuông, rõ mặt hoặc logo để dễ nhận ra.
      </p>

      <input
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />

      {localError ? <p className="text-xs text-rose-300">{localError}</p> : null}

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
