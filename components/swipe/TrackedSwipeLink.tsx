"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  trackFeedReadMore,
  type SwipeAnalyticsContext
} from "@/lib/analytics/trackSwipeEvents";

type TrackedSwipeLinkProps = {
  children: ReactNode;
  className: string;
  context: SwipeAnalyticsContext;
  href: string;
  onClick?: () => void;
};

export function TrackedSwipeLink({
  children,
  className,
  context,
  href,
  onClick
}: TrackedSwipeLinkProps) {
  return (
    <Link
      className={className}
      href={href}
      onClick={() => {
        trackFeedReadMore(context);
        onClick?.();
      }}
    >
      {children}
    </Link>
  );
}
