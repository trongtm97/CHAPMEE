import type { ReactNode } from "react";

type StudioPanelProps = {
  children: ReactNode;
  className?: string;
  minHeight?: "none" | "sm" | "md";
};

const minHeightClass = {
  md: "min-h-0 lg:min-h-[10.5rem]",
  none: "min-h-0",
  sm: "min-h-0 lg:min-h-[8.5rem]"
} as const;

export function StudioPanel({
  children,
  className = "",
  minHeight = "none"
}: StudioPanelProps) {
  return (
    <div
      className={`flex h-full flex-col rounded-xl border border-white/10 bg-zinc-950/40 ${minHeightClass[minHeight]} ${className}`}
    >
      {children}
    </div>
  );
}

export function StudioPanelBody({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-1 flex-col p-2.5 sm:p-3.5 ${className}`}
    >
      {children}
    </div>
  );
}
