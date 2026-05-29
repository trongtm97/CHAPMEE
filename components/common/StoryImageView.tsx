"use client";

import { StoryImageMedia } from "@/components/common/StoryImageMedia";
import {
  getStoryImage,
  getStoryImageForUsage
} from "@/lib/images/get-story-image";
import {
  STORY_IMAGE_ASPECT_CLASS,
  type StoryImageUsageKey
} from "@/lib/images/story-image-usage";
import {
  getStoryPlaceholderInitial,
  STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS
} from "@/lib/images/placeholders";
import type { StoryImageVariant, StoryWithImages } from "@/types/story-images";

type StoryImageViewProps = {
  story: StoryWithImages;
  usage?: StoryImageUsageKey;
  variant?: StoryImageVariant;
  aspectClass?: string;
  wrapperClassName?: string;
  imgClassName?: string;
  priority?: boolean;
};

export function StoryImageView({
  aspectClass,
  imgClassName = "h-full w-full object-cover",
  priority = false,
  story,
  usage,
  variant,
  wrapperClassName = ""
}: StoryImageViewProps) {
  const image = usage
    ? getStoryImageForUsage(story, usage)
    : getStoryImage(story, variant ?? "thumb");

  const aspect =
    aspectClass ?? (usage ? STORY_IMAGE_ASPECT_CLASS[usage] : "aspect-[2/3] w-full");

  return (
    <StoryImageMedia
      className=""
      image={image}
      imgClassName={imgClassName}
      priority={priority}
      wrapperClassName={`${aspect} ${wrapperClassName}`.trim()}
    />
  );
}

/** Small fixed-size cover (thumb / square) for dense lists and collection stacks. */
export function StoryImageThumb({
  story,
  usage = "searchResult",
  className = "relative h-10 w-7 shrink-0 overflow-hidden rounded-md border border-white/8 bg-white/5"
}: {
  story: StoryWithImages;
  usage?: StoryImageUsageKey;
  className?: string;
}) {
  const image = getStoryImageForUsage(story, usage);

  if (!image.src) {
    return (
      <div
        aria-label={image.alt}
        className={`flex items-center justify-center text-xs font-black text-white/85 ${STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS} ${className}`}
        role="img"
      >
        {getStoryPlaceholderInitial(image.alt)}
      </div>
    );
  }

  return (
    <StoryImageMedia
      className={className}
      image={image}
      imgClassName="h-full w-full object-cover"
    />
  );
}
