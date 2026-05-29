"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui";
import { getCroppedImageDataUrl } from "@/lib/profile/cropImage";

type AvatarCropperProps = {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
  loading?: boolean;
};

export function AvatarCropper({
  imageSrc,
  loading = false,
  onCancel,
  onConfirm
}: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) {
      return;
    }
    const dataUrl = await getCroppedImageDataUrl(imageSrc, croppedAreaPixels);
    onConfirm(dataUrl);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md overflow-hidden rounded-t-[1.25rem] border border-white/10 bg-[#0f141b] sm:rounded-[1.25rem]">
        <div className="border-b border-white/8 px-4 py-3">
          <h2 className="text-base font-bold text-white">Căn chỉnh ảnh đại diện</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Kéo và phóng to ảnh trước khi lưu.</p>
        </div>

        <div className="relative h-72 bg-zinc-950">
          <Cropper
            aspect={1}
            crop={crop}
            cropShape="round"
            image={imageSrc}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            showGrid={false}
            zoom={zoom}
          />
        </div>

        <div className="space-y-3 px-4 py-4">
          <label className="block text-xs font-medium text-zinc-400">
            Phóng to
            <input
              className="mt-2 w-full accent-cyan-300"
              max={3}
              min={1}
              onChange={(event) => setZoom(Number(event.target.value))}
              step={0.05}
              type="range"
              value={zoom}
            />
          </label>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={onCancel} type="button" variant="secondary">
              Hủy
            </Button>
            <Button className="flex-1" loading={loading} onClick={() => void handleConfirm()} type="button">
              Lưu ảnh
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
