"use client";

import type { FocalPoint } from "@/lib/images/crop-with-focal-point";
import { focalToObjectPosition } from "@/lib/images/parse-focal-point";

type StoryImageVariantPreviewProps = {
  imageUrl: string;
  focal: FocalPoint;
};

const PREVIEW_FRAMES = [
  { id: "landscape", label: "Ảnh ngang", aspectClass: "aspect-video" },
  { id: "portrait", label: "Ảnh dọc", aspectClass: "aspect-[2/3]" },
  { id: "square", label: "Ảnh vuông", aspectClass: "aspect-square" }
] as const;

export function StoryImageVariantPreview({
  focal,
  imageUrl
}: StoryImageVariantPreviewProps) {
  const objectPosition = focalToObjectPosition(focal);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-zinc-400">Xem trước căn ảnh</p>
      <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-0.5 sm:grid sm:grid-cols-3 sm:overflow-visible">
        {PREVIEW_FRAMES.map((frame) => (
          <div className="w-[8.5rem] shrink-0 sm:w-auto" key={frame.id}>
            <p className="mb-1 text-[0.65rem] font-semibold text-zinc-500">{frame.label}</p>
            <div
              className={`overflow-hidden rounded-lg border border-white/10 bg-zinc-900 ${frame.aspectClass}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
                src={imageUrl}
                style={{ objectPosition }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
