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
};

export function TrackedNextChapterLink({
  children,
  className,
  context,
  href,
  nextEpisodeNumber
}: TrackedNextChapterLinkProps) {
  return (
    <Link
      className={className}
      href={href}
      onClick={() => trackNextChapterClick(context, nextEpisodeNumber)}
    >
      {children}
    </Link>
  );
}
