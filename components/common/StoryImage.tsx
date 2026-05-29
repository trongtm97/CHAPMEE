"use client";

import Image from "next/image";
import { StoryImageMedia } from "@/components/common/StoryImageMedia";
import { getStoryImageForUsage } from "@/lib/images/get-story-image";
import { getStoryPlaceholderInitial } from "@/lib/images/placeholders";
import type { StoryImageUsageKey } from "@/lib/images/story-image-usage";
import type { StoryWithImages } from "@/types/story-images";

type StoryImageProps = {
  story: StoryWithImages;
  usage: StoryImageUsageKey;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  fill?: boolean;
};

export function StoryImage({
  className = "",
  fill = false,
  imgClassName = "object-cover",
  priority = false,
  story,
  usage
}: StoryImageProps) {
  const image = getStoryImageForUsage(story, usage);

  if (image.isPlaceholder || !image.src) {
    return (
      <div
        aria-label={image.alt}
        className={`flex items-center justify-center ${image.placeholderClassName} ${className}`}
        role="img"
      >
        <span className="text-sm font-black text-white/85">
          {getStoryPlaceholderInitial(image.alt)}
        </span>
      </div>
    );
  }

  if (fill) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {image.blurSrc ? (
          <Image
            alt=""
            aria-hidden
            className="object-cover blur-xl brightness-90 scale-110"
            fill
            sizes="32px"
            src={image.blurSrc}
            unoptimized
          />
        ) : null}
        <Image
          alt={image.alt}
          className={imgClassName}
          fill
          sizes={String(image.width)}
          src={image.src}
          style={{ objectPosition: image.objectPosition }}
          priority={priority}
        />
      </div>
    );
  }

  return (
    <StoryImageMedia
      className={className}
      image={image}
      imgClassName={imgClassName}
      priority={priority}
    />
  );
}
