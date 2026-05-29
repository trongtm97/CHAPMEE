"use client";

import type { ChapterImageBlock } from "@/types/chapter-images";

type ImageBlockProps = {
  block: ChapterImageBlock;
  className?: string;
  priority?: boolean;
};

export function ImageBlock({ block, className = "", priority }: ImageBlockProps) {
  return (
    <figure className={`my-6 w-full max-w-full ${className}`}>
      <div className="relative mx-auto w-full max-w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={block.alt.trim() || "Minh họa chương"}
          className="h-auto w-full max-w-full object-contain"
          decoding="async"
          height={block.height}
          loading={priority ? "eager" : "lazy"}
          src={block.src}
          width={block.width}
        />
      </div>
      {block.caption.trim() ? (
        <figcaption className="mt-2 text-center text-sm leading-6 text-zinc-500">
          {block.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
