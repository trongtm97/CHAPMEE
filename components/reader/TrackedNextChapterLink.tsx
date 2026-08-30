"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  trackNextChapterClick,
  type ReaderAnalyticsContext
} from "@/lib/analytics/trackReaderEvents";

type TrackedNextChapterLinkProps = {
  className: string;
  context: ReaderAnalyticsContext;
  href: string;
  nextEpisodeNumber: number;
  children: ReactNode;
  onPrefetchIntent?: () => void;
};

export function TrackedNextChapterLink({
  children,
  className,
  context,
  href,
  nextEpisodeNumber,
  onPrefetchIntent
}: TrackedNextChapterLinkProps) {
  return (
    <Link
      className={className}
      href={href}
      onFocus={onPrefetchIntent}
      onMouseEnter={onPrefetchIntent}
      onClick={() => trackNextChapterClick(context, nextEpisodeNumber)}
    >
      {children}
    </Link>
  );
}
