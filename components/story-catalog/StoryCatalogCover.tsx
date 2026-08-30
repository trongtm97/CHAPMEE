import type { ReactNode } from "react";
import { ChapMeeStoryCover } from "@/components/common/ChapMeeCover";
import { CATALOG_ROW_COVER_WIDTH_CLASS, getCatalogCoverSizes } from "@/lib/images/story-cover";
import type { StoryAudioBadgeDisplay } from "@/src/components/story/StoryAudioBadge";
import type { StoryCatalogStory } from "@/types/story";

type StoryCatalogCoverProps = {
  story: StoryCatalogStory;
  variant: "row" | "grid";
  audioBadgeDisplay?: StoryAudioBadgeDisplay;
  className?: string;
  genreLabel?: string | null;
  statusLabel?: string;
  hasAudio?: boolean;
  hasVideo?: boolean;
  contentOrigin?: StoryCatalogStory["contentOrigin"];
  rightsStatus?: string | null;
};

function CoverBadge({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-zinc-100 backdrop-blur-sm ${className}`}
    >
      {children}
    </span>
  );
}

function AudioIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M9 18V6l8-3v15M6 15a3 3 0 1 0 0-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function VideoIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="m15 10 4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CoverMediaIcons({
  audioBadgeDisplay,
  hasAudio,
  hasVideo,
  variant
}: {
  audioBadgeDisplay?: StoryAudioBadgeDisplay;
  hasAudio: boolean;
  hasVideo: boolean;
  variant: "row" | "grid";
}) {
  const showAudio = (audioBadgeDisplay?.showAudioBadge ?? true) && hasAudio;
  const showVideo = hasVideo;

  if (!showAudio && !showVideo) {
    return null;
  }

  const posClass = variant === "row" ? "right-1 top-1" : "right-1.5 top-1.5";

  return (
    <div className={`absolute z-20 flex gap-1 ${posClass}`}>
      {showAudio ? (
        <span
          className="flex h-5 w-5 items-center justify-center rounded-md bg-black/55 text-emerald-100 backdrop-blur-sm"
          title="Có audio"
        >
          <AudioIcon />
        </span>
      ) : null}
      {showVideo ? (
        <span
          className="flex h-5 w-5 items-center justify-center rounded-md bg-black/55 text-fuchsia-100 backdrop-blur-sm"
          title="Có video"
        >
          <VideoIcon />
        </span>
      ) : null}
    </div>
  );
}

function CoverOriginBadge({
  contentOrigin,
  rightsStatus,
  variant
}: {
  contentOrigin?: StoryCatalogStory["contentOrigin"];
  rightsStatus?: string | null;
  variant: "row" | "grid";
}) {
  const isTranslation = contentOrigin === "translation";
  const isVerified = rightsStatus === "verified";

  const label = !isTranslation
    ? "Truyện sáng tác"
    : isVerified
      ? "Truyện dịch · Có phép"
      : "Truyện dịch";

  const toneClass = !isTranslation
    ? "border-cyan-300/30 bg-black/60 text-cyan-100"
    : isVerified
      ? "border-emerald-400/30 bg-black/60 text-emerald-100"
      : "border-violet-400/30 bg-black/60 text-violet-100";

  const sizeClass =
    variant === "row"
      ? "rounded-none rounded-br-md border-l-0 border-t-0 px-1 py-px text-[7px] leading-none"
      : "rounded-md px-2 py-0.5 text-[10px] leading-tight";

  return (
    <span
      className={`inline-flex w-fit items-center whitespace-nowrap border font-semibold backdrop-blur-sm ${sizeClass} ${toneClass}`}
    >
      {label}
    </span>
  );
}

function CoverOverlays({
  audioBadgeDisplay,
  contentOrigin,
  genreLabel,
  hasAudio,
  hasVideo,
  rightsStatus,
  statusLabel,
  variant
}: {
  audioBadgeDisplay?: StoryAudioBadgeDisplay;
  contentOrigin?: StoryCatalogStory["contentOrigin"];
  genreLabel?: string | null;
  hasAudio: boolean;
  hasVideo: boolean;
  rightsStatus?: string | null;
  statusLabel?: string;
  variant: "row" | "grid";
}) {
  const isRow = variant === "row";
  const roundedClass = isRow ? "rounded-lg" : "rounded-xl";
  const showAudio = (audioBadgeDisplay?.showAudioBadge ?? true) && hasAudio;
  const showVideo = hasVideo;
  const reserveTopRight = showAudio || showVideo;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${roundedClass}`}>
      <div
        aria-hidden
        className={`absolute inset-x-0 top-0 z-[1] bg-gradient-to-b to-transparent ${
          isRow ? "h-8 from-black/35 via-black/10" : "h-[28%] from-black/55 via-black/20"
        }`}
      />
      <div
        aria-hidden
        className={`absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/75 via-black/35 to-transparent ${
          isRow ? "h-[28%]" : "h-[34%]"
        }`}
      />
      <div
        className={`absolute z-20 ${
          isRow
            ? "left-0 top-0 max-w-[72%]"
            : `left-1.5 top-1.5 ${reserveTopRight ? "right-9" : "right-1.5"}`
        }`}
      >
        <CoverOriginBadge
          contentOrigin={contentOrigin}
          rightsStatus={rightsStatus}
          variant={variant}
        />
      </div>
      <CoverMediaIcons
        audioBadgeDisplay={audioBadgeDisplay}
        hasAudio={hasAudio}
        hasVideo={hasVideo}
        variant={variant}
      />
      <div
        className={`absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-1 ${
          isRow ? "p-1" : "p-1.5"
        }`}
      >
        {genreLabel ? (
          <CoverBadge className="max-w-[58%]">{genreLabel}</CoverBadge>
        ) : (
          <span />
        )}
        {statusLabel ? (
          <CoverBadge className="shrink-0 text-[8px]">{statusLabel}</CoverBadge>
        ) : null}
      </div>
    </div>
  );
}

export function StoryCatalogCover({
  audioBadgeDisplay,
  className = "",
  contentOrigin,
  genreLabel,
  hasAudio = false,
  hasVideo = false,
  rightsStatus,
  statusLabel,
  story,
  variant
}: StoryCatalogCoverProps) {
  const isRow = variant === "row";
  const usage = isRow ? "catalogRow" : "catalogGrid";

  return (
    <div
      className={`relative shrink-0 ${isRow ? `${CATALOG_ROW_COVER_WIDTH_CLASS} min-w-[7.25rem]` : "w-full"} ${className}`}
    >
      <ChapMeeStoryCover
        className={`w-full overflow-hidden shadow-md shadow-black/30 ${isRow ? "rounded-lg" : "rounded-xl transition duration-300 group-hover/card:scale-[1.01]"}`}
        rounded={false}
        showFallbackTitle={false}
        size={isRow ? "catalogRow" : "full"}
        sizes={getCatalogCoverSizes(variant)}
        story={story}
        usage={usage}
      />
      <CoverOverlays
        audioBadgeDisplay={audioBadgeDisplay}
        contentOrigin={contentOrigin}
        genreLabel={genreLabel}
        hasAudio={hasAudio}
        hasVideo={hasVideo}
        rightsStatus={rightsStatus}
        statusLabel={statusLabel}
        variant={variant}
      />
    </div>
  );
}
