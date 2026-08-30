import type { ReactNode } from "react";

type MediaGridProps = {
  children: ReactNode;
  variant?: "audio" | "video";
};

export function MediaGrid({ children, variant = "audio" }: MediaGridProps) {
  const className =
    variant === "video"
      ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return <div className={className}>{children}</div>;
}
