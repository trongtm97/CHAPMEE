"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";

type ReaderMobileBottomBarProps = {
  data: EpisodeReaderData;
  onOpenChapterList: () => void;
  onOpenComments: () => void;
  onOpenSettings: () => void;
  commentsCount?: number;
  onPrefetchNext?: () => void;
  onPrefetchPrevious?: () => void;
};

export function ReaderMobileBottomBar({
  commentsCount = 0,
  data,
  onOpenChapterList,
  onOpenComments,
  onOpenSettings,
  onPrefetchNext,
  onPrefetchPrevious
}: ReaderMobileBottomBarProps) {
  return (
    <nav
      aria-label="Điều hướng đọc"
      className="reader-mobile-bottom-bar fixed inset-x-0 bottom-0 z-[105] border-t border-white/[0.06] bg-[#06090d]/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-1">
        {data.previousChapterHref ? (
          <MobileBarLink
            href={data.previousChapterHref}
            label="Chương trước"
            onPrefetchIntent={onPrefetchPrevious}
          >
            ← Trước
          </MobileBarLink>
        ) : (
          <span className="flex-1" />
        )}
        <MobileBarButton ariaLabel="Danh sách chương" onClick={onOpenChapterList}>
          <ListIcon />
        </MobileBarButton>
        <MobileBarButton ariaLabel="Bình luận" onClick={onOpenComments}>
          <CommentIcon />
          {commentsCount > 0 ? (
            <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-cyan-300 px-0.5 text-[0.5625rem] font-bold text-zinc-950">
              {commentsCount > 9 ? "9+" : commentsCount}
            </span>
          ) : null}
        </MobileBarButton>
        <MobileBarButton ariaLabel="Cài đặt đọc" onClick={onOpenSettings}>
          <span className="text-xs font-bold">Aa</span>
        </MobileBarButton>
        {data.nextChapterHref ? (
          <MobileBarLink
            href={data.nextChapterHref}
            label="Chương sau"
            onPrefetchIntent={onPrefetchNext}
            primary
          >
            Sau →
          </MobileBarLink>
        ) : (
          <span className="flex-1" />
        )}
      </div>
    </nav>
  );
}

function MobileBarLink({
  children,
  href,
  label,
  onPrefetchIntent,
  primary = false
}: {
  href: string;
  label: string;
  children: ReactNode;
  onPrefetchIntent?: () => void;
  primary?: boolean;
}) {
  return (
    <Link
      aria-label={label}
      className={`tap-highlight flex h-10 min-w-[4.5rem] flex-1 items-center justify-center rounded-full px-2 text-xs font-bold ${
        primary
          ? "bg-cyan-300 text-zinc-950"
          : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
      }`}
      href={href}
      onFocus={onPrefetchIntent}
      onMouseEnter={onPrefetchIntent}
    >
      {children}
    </Link>
  );
}

function MobileBarButton({
  ariaLabel,
  children,
  onClick
}: {
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="tap-highlight relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-300 hover:bg-white/[0.06]"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
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

function CommentIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}
