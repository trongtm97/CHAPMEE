"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";

type ReaderToolbarProps = {
  data: EpisodeReaderData;
  onOpenChapterList: () => void;
  onOpenSettings: () => void;
  onOpenComments: () => void;
  onOpenMenu: () => void;
  commentsCount?: number;
  className?: string;
  storyAudioHref?: string | null;
  onPrefetchNext?: () => void;
  onPrefetchPrevious?: () => void;
};

export function ReaderToolbar({
  className = "",
  commentsCount = 0,
  data,
  storyAudioHref = null,
  onOpenChapterList,
  onOpenComments,
  onOpenMenu,
  onOpenSettings,
  onPrefetchNext,
  onPrefetchPrevious
}: ReaderToolbarProps) {
  return (
    <div
      className={`reader-toolbar hidden items-center justify-between gap-2 border-b border-white/[0.04] py-2 lg:flex ${className}`.trim()}
      role="toolbar"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <ToolbarLink href={data.storyHref} label="Về trang truyện">
          Truyện
        </ToolbarLink>
        {storyAudioHref ? (
          <ToolbarLink href={storyAudioHref} label="Mở audio của truyện">
            <span className="inline-flex items-center gap-1">
              <AudioIcon />
              Audio
            </span>
          </ToolbarLink>
        ) : null}
        {data.previousEpisodeNumber && data.previousChapterHref ? (
          <ToolbarLink
            href={data.previousChapterHref}
            label="Chương trước"
            onPrefetchIntent={onPrefetchPrevious}
          >
            ← Trước
          </ToolbarLink>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <ToolbarButton ariaLabel="Danh sách chương" onClick={onOpenChapterList}>
          <ListIcon />
        </ToolbarButton>
        <ToolbarButton ariaLabel="Cài đặt đọc" onClick={onOpenSettings}>
          <span className="text-[0.8125rem] font-bold">Aa</span>
        </ToolbarButton>
        <ToolbarButton ariaLabel="Bình luận" onClick={onOpenComments}>
          <CommentIcon />
          {commentsCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-300 px-1 text-[0.625rem] font-bold text-zinc-950">
              {commentsCount > 99 ? "99+" : commentsCount}
            </span>
          ) : null}
        </ToolbarButton>
        <ToolbarButton ariaLabel="Tùy chọn thêm" onClick={onOpenMenu}>
          <MoreIcon />
        </ToolbarButton>
        {data.nextEpisodeNumber && data.nextChapterHref ? (
          <Link
            aria-label="Chương sau"
            className="tap-highlight ml-1 inline-flex h-9 items-center rounded-full bg-cyan-300/15 px-3 text-xs font-bold text-cyan-100 ring-1 ring-cyan-300/30 hover:bg-cyan-300/20"
            href={data.nextChapterHref}
            onFocus={onPrefetchNext}
            onMouseEnter={onPrefetchNext}
          >
            Sau →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function ToolbarLink({
  children,
  href,
  label,
  onPrefetchIntent
}: {
  href: string;
  label: string;
  children: ReactNode;
  onPrefetchIntent?: () => void;
}) {
  return (
    <Link
      aria-label={label}
      className="tap-highlight inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
      href={href}
      onFocus={onPrefetchIntent}
      onMouseEnter={onPrefetchIntent}
    >
      {children}
    </Link>
  );
}

function ToolbarButton({
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
      className="tap-highlight relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 hover:bg-white/[0.06]"
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

function MoreIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

function AudioIcon() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 6v12m-5-9v6m10-8v10m-15-6v2m20-4v6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
