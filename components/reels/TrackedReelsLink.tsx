"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  trackFeedReadMore,
  type ReelsAnalyticsContext
} from "@/lib/analytics/trackReelsEvents";

type TrackedReelsLinkProps = {
  children: ReactNode;
  className: string;
  context: ReelsAnalyticsContext;
  href: string;
  onClick?: () => void;
};

export function TrackedReelsLink({
  children,
  className,
  context,
  href,
  onClick
}: TrackedReelsLinkProps) {
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
