"use client";

import { useRouter } from "next/navigation";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { useEffect, useState, type ReactNode } from "react";

type ReaderHeaderProps = {
  storySlug: string;
  storyPublicCode: string;
  storyTitle: string;
  episodeTitle: string;
  episodeNumber: number;
  onOpenSettings: () => void;
  onOpenEpisodeList: () => void;
  onOpenMenu: () => void;
};

export function ReaderHeader({
  episodeNumber,
  episodeTitle,
  onOpenEpisodeList,
  onOpenMenu,
  onOpenSettings,
  storyPublicCode,
  storySlug,
  storyTitle
}: ReaderHeaderProps) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const headerLabel =
    episodeTitle?.trim() || storyTitle?.trim() || `Chap ${episodeNumber}`;
  const headerTitle = headerLabel;

  useEffect(() => {
    let lastY = window.scrollY;

    function onScroll() {
      const currentY = window.scrollY;
      const delta = currentY - lastY;
      if (currentY < 48) {
        setHidden(false);
      } else if (delta > 6) {
        setHidden(true);
      } else if (delta < -6) {
        setHidden(false);
      }
      lastY = currentY;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(getStoryDetailHref({ slug: storySlug, public_code: storyPublicCode }));
  }

  return (
    <header
      className={`sticky top-0 z-[110] -mx-4 border-b border-white/[0.04] bg-[#06090d]/92 backdrop-blur-md transition-transform duration-200 md:-mx-6 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="flex h-11 items-center gap-1 px-4 md:px-6">
        <button
          aria-label="Quay lại"
          className="tap-highlight flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-200 hover:bg-white/[0.06]"
          onClick={handleBack}
          type="button"
        >
          <BackIcon />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden px-0.5">
          <p
            className="truncate text-sm font-semibold leading-5 text-zinc-100"
            title={headerTitle}
          >
            {headerLabel}
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          <IconButton ariaLabel="Danh sách chương" onClick={onOpenEpisodeList}>
            <ListIcon />
          </IconButton>
          <IconButton ariaLabel="Cài đặt đọc" onClick={onOpenSettings}>
            <span className="text-[0.8125rem] font-bold tracking-tight">Aa</span>
          </IconButton>
          <IconButton ariaLabel="Tùy chọn" onClick={onOpenMenu}>
            <MoreIcon />
          </IconButton>
        </div>
      </div>
    </header>
  );
}

function IconButton({
  ariaLabel,
  children,
  onClick
}: {
  ariaLabel: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="tap-highlight flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-200 hover:bg-white/[0.06]"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function BackIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}
