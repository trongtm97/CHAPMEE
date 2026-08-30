"use client";

import type { CSSProperties } from "react";
import type { ChapterImageBlock } from "@/types/chapter-images";

type ImageBlockProps = {
  block: ChapterImageBlock;
  className?: string;
  priority?: boolean;
};

function chapterImageAspectRatio(block: ChapterImageBlock) {
  const width = Math.max(0, block.width);
  const height = Math.max(0, block.height);

  if (width > 0 && height > 0) {
    return `${width} / ${height}`;
  }

  return undefined;
}

const alignFigureClass: Record<"left" | "center" | "right", string> = {
  left: "mr-auto max-w-full sm:max-w-[66%]",
  center: "mx-auto max-w-full",
  right: "ml-auto max-w-full sm:max-w-[66%]"
};

export function ImageBlock({ block, className = "", priority }: ImageBlockProps) {
  const aspectRatio = chapterImageAspectRatio(block);
  const frameStyle: CSSProperties | undefined = aspectRatio
    ? { aspectRatio }
    : undefined;
  const align = block.align === "left" || block.align === "right" ? block.align : "center";

  return (
    <figure className={`reader-chapter-image my-6 w-full ${alignFigureClass[align]} ${className}`}>
      <div
        className="relative mx-auto w-full max-w-full overflow-hidden rounded-xl border border-white/10 bg-black/20"
        style={frameStyle}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={block.alt.trim() || "Minh họa chương"}
          className={
            aspectRatio
              ? "absolute inset-0 block h-full w-full object-contain"
              : "block h-auto w-full max-w-full object-contain"
          }
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          sizes="(max-width: 640px) 100vw, 42rem"
          src={block.src}
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
