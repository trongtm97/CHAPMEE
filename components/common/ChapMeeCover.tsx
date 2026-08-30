"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  CHAPMEE_COVER_ASPECT_CLASS,
  CHAPMEE_COVER_SIZE_CLASS,
  type ChapMeeCoverSize
} from "@/lib/images/cover-sizes";
import { getStoryImageForUsage, getStoryImageSizes } from "@/lib/images/get-story-image";
import { getVariantForUsage, type StoryImageUsageKey } from "@/lib/images/story-image-usage";
import {
  STORY_COVER_FALLBACK_FRAME_CLASS,
  STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS,
  STORY_IMAGE_PLACEHOLDER_TEXTURE_CLASS,
  getStoryCoverFallbackTitle,
  getStoryPlaceholderInitial
} from "@/lib/images/placeholders";
import type { StoryWithImages } from "@/types/story-images";

const FALLBACK_INITIAL: Record<ChapMeeCoverSize, string> = {
  xs: "text-xl",
  sm: "text-3xl",
  md: "text-4xl",
  lg: "text-4xl",
  xl: "text-5xl",
  discoverSm: "text-3xl",
  discover: "text-4xl",
  discoverLg: "text-5xl",
  catalogRow: "text-4xl",
  full: "text-5xl"
};

const FALLBACK_TITLE: Record<ChapMeeCoverSize, string> = {
  xs: "text-[7px]",
  sm: "text-[8px]",
  md: "text-[9px]",
  lg: "text-[9px]",
  xl: "text-[10px]",
  discoverSm: "text-[8px]",
  discover: "text-[9px]",
  discoverLg: "text-[10px]",
  catalogRow: "text-[8px]",
  full: "text-[10px]"
};

export type ChapMeeCoverProps = {
  src?: string | null;
  alt: string;
  title?: string;
  size?: ChapMeeCoverSize;
  rounded?: boolean;
  priority?: boolean;
  className?: string;
  badge?: ReactNode;
  overlayBadges?: ReactNode;
  fallbackInitial?: string;
  fallbackTitle?: string;
  /** When false, fallback shows only the initial (overlays handle genre/status). */
  showFallbackTitle?: boolean;
  fallbackClassName?: string;
  objectPosition?: string;
  imgClassName?: string;
  sizes?: string;
  width?: number;
  height?: number;
  blurDataURL?: string | null;
};

function canUseNextImage(src: string) {
  if (src.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(src);
    return (
      url.hostname === "chapmee.com" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

function StoryCoverFallback({
  alt,
  fallbackClassName,
  initial,
  roundedClass,
  showTitle,
  size,
  titleLine
}: {
  alt: string;
  fallbackClassName: string;
  initial: string;
  roundedClass: string;
  showTitle: boolean;
  size: ChapMeeCoverSize;
  titleLine: string;
}) {
  return (
    <div
      aria-label={alt}
      className={`relative flex size-full min-h-0 flex-col overflow-hidden ${STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS} ${STORY_IMAGE_PLACEHOLDER_TEXTURE_CLASS} ${roundedClass} ${fallbackClassName}`}
      role="img"
    >
      <div className={STORY_COVER_FALLBACK_FRAME_CLASS} />
      <div
        aria-hidden
        className="absolute left-1/2 top-[36%] h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-2xl"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 pb-5 pt-1">
        <span
          className={`relative z-[1] font-black leading-none tracking-tight text-white/95 drop-shadow-[0_3px_12px_rgba(0,0,0,0.5)] ${FALLBACK_INITIAL[size]}`}
        >
          {initial}
        </span>
        {showTitle && titleLine ? (
          <span
            className={`relative z-[1] mt-2 line-clamp-1 max-w-[92%] text-center font-semibold uppercase tracking-[0.12em] text-white/40 ${FALLBACK_TITLE[size]}`}
          >
            {titleLine}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ChapMeeCover({
  alt,
  badge,
  blurDataURL,
  className = "",
  fallbackClassName = "",
  fallbackInitial,
  fallbackTitle,
  height,
  imgClassName = "size-full object-cover",
  objectPosition = "center",
  overlayBadges,
  priority = false,
  rounded = true,
  showFallbackTitle = true,
  size = "full",
  sizes,
  src,
  title,
  width
}: ChapMeeCoverProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = src && !failed ? src : null;
  const initial = fallbackInitial ?? getStoryPlaceholderInitial(title ?? alt);
  const titleSource = fallbackTitle ?? title ?? alt;
  const titleLine = getStoryCoverFallbackTitle(titleSource, size === "catalogRow" ? 16 : 22);
  const roundedClass = rounded ? "rounded-lg" : "";

  return (
    <div
      className={`relative block shrink-0 self-start overflow-hidden border border-white/10 bg-[#0a1018] shadow-sm shadow-black/25 ${CHAPMEE_COVER_ASPECT_CLASS} ${CHAPMEE_COVER_SIZE_CLASS[size]} ${roundedClass} ${className}`}
    >
      {resolvedSrc ? (
        canUseNextImage(resolvedSrc) ? (
          <Image
            alt={alt}
            blurDataURL={blurDataURL ?? undefined}
            className={imgClassName}
            fill
            onError={() => setFailed(true)}
            placeholder={blurDataURL ? "blur" : "empty"}
            priority={priority}
            sizes={sizes ?? "120px"}
            src={resolvedSrc}
            style={{ objectPosition }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={alt}
            className={
              imgClassName.includes("absolute")
                ? imgClassName
                : `absolute inset-0 h-full w-full object-cover ${imgClassName}`
            }
            decoding="async"
            height={height}
            loading={priority ? "eager" : "lazy"}
            onError={() => setFailed(true)}
            sizes={sizes}
            src={resolvedSrc}
            style={{ objectPosition }}
            width={width}
          />
        )
      ) : (
        <StoryCoverFallback
          alt={alt}
          fallbackClassName={fallbackClassName}
          initial={initial}
          roundedClass={roundedClass}
          showTitle={showFallbackTitle && Boolean(titleLine)}
          size={size}
          titleLine={titleLine}
        />
      )}
      {overlayBadges ? (
        <div className="pointer-events-none absolute inset-0 z-10">{overlayBadges}</div>
      ) : null}
      {badge ? <div className="pointer-events-none absolute inset-0 z-10">{badge}</div> : null}
    </div>
  );
}

type ChapMeeStoryCoverProps = Omit<
  ChapMeeCoverProps,
  "src" | "alt" | "objectPosition" | "title" | "width" | "height"
> & {
  story: StoryWithImages;
  usage: StoryImageUsageKey;
};

export function ChapMeeStoryCover({ story, usage, sizes, ...rest }: ChapMeeStoryCoverProps) {
  const image = getStoryImageForUsage(story, usage);
  const variant = getVariantForUsage(usage);

  return (
    <ChapMeeCover
      alt={image.alt}
      blurDataURL={image.blurSrc}
      height={image.height}
      objectPosition={image.objectPosition}
      sizes={sizes ?? getStoryImageSizes(variant)}
      src={image.src}
      title={story.title}
      width={image.width}
      {...rest}
    />
  );
}
