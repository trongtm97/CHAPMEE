"use client";

import type { FocalPoint } from "@/lib/images/crop-with-focal-point";
import { normalizeFocalPoint } from "@/lib/images/parse-focal-point";

type FocalPointPickerProps = {
  imageUrl: string;
  focal: FocalPoint;
  onFocalChange: (focal: FocalPoint) => void;
  disabled?: boolean;
};

function getFocalFromPointer(
  event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  element: HTMLDivElement
): FocalPoint {
  const rect = element.getBoundingClientRect();
  const clientX =
    "touches" in event && event.touches.length > 0
      ? event.touches[0].clientX
      : (event as React.MouseEvent).clientX;
  const clientY =
    "touches" in event && event.touches.length > 0
      ? event.touches[0].clientY
      : (event as React.MouseEvent).clientY;

  return normalizeFocalPoint({
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height
  });
}

export function FocalPointPicker({
  disabled = false,
  focal,
  imageUrl,
  onFocalChange
}: FocalPointPickerProps) {
  const normalized = normalizeFocalPoint(focal);

  function handlePointer(
    event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) {
    if (disabled) {
      return;
    }

    event.preventDefault();
    onFocalChange(getFocalFromPointer(event, event.currentTarget));
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-200">Chọn vùng ảnh quan trọng</p>
      <p className="text-xs leading-5 text-zinc-500">
        Chọn vùng quan trọng để ChapMee tự căn ảnh đẹp ở mọi vị trí. ChapMee sẽ tự căn
        ảnh cho các vị trí khác nhau.
      </p>
      <p className="text-[0.65rem] text-zinc-600">Chạm hoặc bấm vào vùng bạn muốn giữ.</p>

      <div
        className={`relative max-h-[min(52vh,22rem)] w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900 ${
          disabled ? "pointer-events-none opacity-60" : "cursor-crosshair touch-none"
        }`}
        onClick={handlePointer}
        onTouchStart={handlePointer}
        role="presentation"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Chọn điểm quan trọng trên ảnh"
          className="max-h-[min(52vh,22rem)] w-full object-contain"
          draggable={false}
          src={imageUrl}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-300 shadow-[0_0_0_3px_rgba(0,0,0,0.35)]"
          style={{
            left: `${normalized.x * 100}%`,
            top: `${normalized.y * 100}%`
          }}
        />
      </div>
    </div>
  );
}
