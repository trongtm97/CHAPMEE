"use client";

import { useMemo, useState } from "react";
import { BRAND_NAME } from "@/lib/brand/constants";
import { getStoryImageSrc } from "@/lib/images/get-story-image";
import type { StoryImageVariant } from "@/types/story-images";

type StoryCoverSize = "small" | "medium" | "featured";

const SIZE_TO_VARIANT: Record<StoryCoverSize, StoryImageVariant> = {
  small: "portrait",
  medium: "portrait",
  featured: "portrait"
};

type StoryCoverProps = {
  title: string;
  genreName?: string | null;
  genreSlug?: string | null;
  coverUrl?: string | null;
  size?: StoryCoverSize;
  className?: string;
};

const sizeClasses: Record<StoryCoverSize, string> = {
  small: "aspect-[3/4] w-16 sm:w-[4.75rem]",
  medium: "aspect-[3/4] w-full",
  featured: "aspect-[3/4] w-full max-w-[12rem] sm:max-w-[14rem]"
};

const radiusClasses: Record<StoryCoverSize, string> = {
  small: "rounded-[1rem]",
  medium: "rounded-[1.35rem]",
  featured: "rounded-[1.75rem]"
};

type CoverTheme = {
  palette: string;
  accent: string;
  pattern: string;
};

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function normalizeSeed(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[-_]+/g, " ");
}

function getInitials(title: string) {
  const tokens = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "C";
  }

  return tokens
    .map((token) => token[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getTitleSnippet(title: string) {
  const tokens = title.split(/\s+/).filter(Boolean);

  if (tokens.length <= 3) {
    return title;
  }

  return `${tokens.slice(0, 3).join(" ")}...`;
}

function getGenreTheme(seed: string): CoverTheme {
  const normalized = normalizeSeed(seed);

  if (normalized.includes("kinh dị") || normalized.includes("kinh di")) {
    return {
      palette: "from-emerald-500/28 via-zinc-950 to-black",
      accent: "bg-emerald-300/18",
      pattern:
        "radial-gradient(circle at 20% 20%, rgba(74,222,128,0.16) 0 2px, transparent 3px), linear-gradient(135deg, rgba(255,255,255,0.04) 0 12%, transparent 12% 100%)"
    };
  }

  if (normalized.includes("trinh thám") || normalized.includes("trinh tham")) {
    return {
      palette: "from-slate-950 via-indigo-950 to-amber-500/20",
      accent: "bg-amber-300/16",
      pattern:
        "linear-gradient(115deg, rgba(250,204,21,0.10) 0 2px, transparent 2px 18px), radial-gradient(circle at 80% 18%, rgba(255,255,255,0.12) 0 2px, transparent 3px)"
    };
  }

  if (normalized.includes("ngôn tình") || normalized.includes("ngon tinh")) {
    return {
      palette: "from-rose-500/35 via-fuchsia-600/22 to-zinc-950",
      accent: "bg-rose-200/20",
      pattern:
        "radial-gradient(circle at 78% 20%, rgba(255,255,255,0.18) 0 2px, transparent 3px), radial-gradient(circle at 22% 82%, rgba(255,255,255,0.10) 0 2px, transparent 3px)"
    };
  }

  if (normalized.includes("xuyên không") || normalized.includes("xuyen khong")) {
    return {
      palette: "from-indigo-500/35 via-violet-600/22 to-slate-950",
      accent: "bg-violet-200/18",
      pattern:
        "linear-gradient(135deg, rgba(255,255,255,0.05) 0 10%, transparent 10% 100%), radial-gradient(circle at 25% 30%, rgba(196,181,253,0.16) 0 3px, transparent 4px)"
    };
  }

  if (normalized.includes("chat story")) {
    return {
      palette: "from-cyan-400/32 via-blue-600/24 to-slate-950",
      accent: "bg-cyan-200/20",
      pattern:
        "linear-gradient(90deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 18px), radial-gradient(circle at 20% 75%, rgba(255,255,255,0.14) 0 2px, transparent 3px)"
    };
  }

  if (normalized.includes("chữa lành") || normalized.includes("chua lanh")) {
    return {
      palette: "from-emerald-300/30 via-lime-100/12 to-zinc-950",
      accent: "bg-emerald-100/18",
      pattern:
        "radial-gradient(circle at 25% 18%, rgba(255,255,255,0.16) 0 2px, transparent 3px), radial-gradient(circle at 78% 78%, rgba(190,242,100,0.18) 0 3px, transparent 4px)"
    };
  }

  if (normalized.includes("truyện ngắn") || normalized.includes("truyen ngan")) {
    return {
      palette: "from-teal-400/30 via-cyan-500/18 to-zinc-950",
      accent: "bg-teal-200/18",
      pattern:
        "linear-gradient(135deg, rgba(255,255,255,0.06) 0 10%, transparent 10% 100%), radial-gradient(circle at 72% 24%, rgba(255,255,255,0.14) 0 2px, transparent 3px)"
    };
  }

  return {
    palette: "from-cyan-400/35 via-sky-500/20 to-zinc-950",
    accent: "bg-cyan-200/18",
    pattern:
      "linear-gradient(135deg, rgba(255,255,255,0.05) 0 12%, transparent 12% 100%), radial-gradient(circle at 80% 18%, rgba(255,255,255,0.14) 0 2px, transparent 3px)"
  };
}

function getTitleTagline(seed: string) {
  const normalized = normalizeSeed(seed);

  if (normalized.includes("kinh dị") || normalized.includes("kinh di")) {
    return "Hồi hộp";
  }
  if (normalized.includes("trinh thám") || normalized.includes("trinh tham")) {
    return "Suy đoán";
  }
  if (normalized.includes("ngôn tình") || normalized.includes("ngon tinh")) {
    return "Cảm xúc";
  }
  if (normalized.includes("xuyên không") || normalized.includes("xuyen khong")) {
    return "Dịch chuyển";
  }
  if (normalized.includes("chat story")) {
    return "Nhắn nhanh";
  }
  if (normalized.includes("chữa lành") || normalized.includes("chua lanh")) {
    return "An yên";
  }
  if (normalized.includes("truyện ngắn") || normalized.includes("truyen ngan")) {
    return "Gọn";
  }

  return BRAND_NAME;
}

type StoryCoverFrameProps = {
  title: string;
  genreName?: string | null;
  genreSlug?: string | null;
  coverUrl?: string | null;
  size: StoryCoverSize;
  className: string;
};

function StoryCoverFrame({
  className,
  coverUrl,
  genreName,
  genreSlug,
  size,
  title
}: StoryCoverFrameProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const theme = useMemo(
    () =>
      getGenreTheme(
        `${genreSlug ?? ""} ${genreName ?? ""} ${title} ${hashString(title)}`
      ),
    [genreName, genreSlug, title]
  );

  const isFeatured = size === "featured";
  const isSmall = size === "small";
  const imageSrc = useMemo(
    () =>
      getStoryImageSrc(
        { title, coverUrl },
        SIZE_TO_VARIANT[size]
      ),
    [coverUrl, size, title]
  );
  const resolvedSrc = failed ? null : imageSrc;
  const showFallbackContent = !resolvedSrc;
  const fallbackTitle = isSmall ? getInitials(title) : getTitleSnippet(title);
  const tagline = getTitleTagline(`${genreSlug ?? ""} ${genreName ?? ""}`);

  return (
    <div
      className={`story-cover relative overflow-hidden bg-[var(--surface-soft)] ${sizeClasses[size]} ${radiusClasses[size]} ${className}`}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-gradient-to-br ${theme.palette}`}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_35%)] opacity-85"
      />
      {showFallbackContent ? (
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 top-0 h-[42%] ${theme.accent} blur-2xl`}
        />
      ) : null}
      {showFallbackContent ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-75"
          style={{ backgroundImage: theme.pattern }}
        />
      ) : null}

      {resolvedSrc ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={title}
            className={`absolute inset-0 h-full w-full object-cover transition duration-500 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            decoding="async"
            loading={isFeatured ? "eager" : "lazy"}
            onError={() => {
              setFailed(true);
              setLoaded(false);
            }}
            onLoad={() => setLoaded(true)}
            src={resolvedSrc}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,13,0.02),rgba(5,8,13,0.32)_68%,rgba(5,8,13,0.72))]" />
        </>
      ) : null}

      <div className="absolute inset-0 flex flex-col justify-between p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          {genreName ? (
            <span className="inline-flex max-w-full items-center rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
              <span className="truncate">{genreName}</span>
            </span>
          ) : (
            <span className="inline-flex rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
              {BRAND_NAME}
            </span>
          )}
          {!isSmall && showFallbackContent ? (
            <span className="inline-flex rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
              Mới
            </span>
          ) : null}
        </div>

        {showFallbackContent ? (
          <div className="min-w-0">
            <p
              className={`text-balance font-black text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.28)] ${
                isSmall
                  ? "text-[0.92rem] leading-5"
                  : isFeatured
                    ? "text-[1.15rem] leading-6 sm:text-[1.35rem] sm:leading-7"
                    : "text-[1rem] leading-6"
              }`}
            >
              {fallbackTitle}
            </p>
            {!isSmall ? (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/75">
                {tagline}
              </p>
            ) : null}
          </div>
        ) : (
          <div aria-hidden="true" className="h-8" />
        )}
      </div>

      {showFallbackContent ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="flex size-14 items-center justify-center rounded-full border border-white/15 bg-black/20 text-lg font-black text-white shadow-[0_12px_24px_rgba(0,0,0,0.24)] backdrop-blur-sm">
            {getInitials(title)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function StoryCover(props: StoryCoverProps) {
  const { className = "", size = "medium", ...rest } = props;

  return (
    <StoryCoverFrame
      key={`${props.coverUrl ?? ""}-${props.title}-${props.size}`}
      className={className}
      size={size}
      {...rest}
    />
  );
}
