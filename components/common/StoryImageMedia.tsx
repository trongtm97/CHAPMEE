"use client";

import { useState } from "react";
import type { StoryImageDescriptor } from "@/lib/images/get-story-image";
import {
  getStoryPlaceholderInitial,
  STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS
} from "@/lib/images/placeholders";

type StoryImageMediaProps = {
  image: StoryImageDescriptor;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  /** Giữ khung cố định (aspect) khi ảnh đang tải. */
  wrapperClassName?: string;
};

export function StoryImageMedia({
  className = "",
  image,
  imgClassName = "h-full w-full object-cover",
  priority = false,
  wrapperClassName = ""
}: StoryImageMediaProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed || image.isPlaceholder || !image.src) {
    return (
      <div
        aria-label={image.alt}
        className={`flex items-center justify-center overflow-hidden ${image.placeholderClassName} ${wrapperClassName} ${className}`.trim()}
        role="img"
      >
        <span className="text-sm font-black text-white/85">
          {getStoryPlaceholderInitial(image.alt)}
        </span>
      </div>
    );
  }

  const showSkeleton = !loaded;

  return (
    <div className={`relative overflow-hidden ${wrapperClassName} ${className}`.trim()}>
      {showSkeleton ? (
        image.blurSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl brightness-90"
            decoding="async"
            src={image.blurSrc}
          />
        ) : (
          <div
            aria-hidden
            className={`absolute inset-0 ${STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS}`}
          />
        )
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={image.alt}
        className={`${imgClassName} transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        decoding="async"
        height={image.height}
        loading={priority ? "eager" : "lazy"}
        onError={() => setFailed(true)}
        onLoad={() => setLoaded(true)}
        src={image.src}
        style={{ objectPosition: image.objectPosition }}
        width={image.width}
      />
    </div>
  );
}
