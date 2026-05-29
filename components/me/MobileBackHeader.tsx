"use client";

import { goBackOrFallback } from "@/lib/navigation/goBackOrFallback";

type MobileBackHeaderProps = {
  title: string;
  backLabel?: string;
  fallbackHref?: string;
  rightAction?: React.ReactNode;
  onBack?: () => void;
  variant?: "default" | "compact";
};

export function MobileBackHeader({
  backLabel = "Tôi",
  fallbackHref = "/me",
  onBack,
  rightAction,
  title,
  variant = "default"
}: MobileBackHeaderProps) {
  const isCompact = variant === "compact";

  return (
    <header
      className={`sticky top-0 z-20 border-b border-white/6 bg-[#0b1016]/95 backdrop-blur-xl lg:hidden ${
        isCompact ? "-mx-4 px-4 py-2.5" : "-mx-4 px-4 py-2"
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          aria-label={isCompact ? "Quay lại" : `Quay lại ${backLabel}`}
          className="tap-highlight inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full text-zinc-100 transition hover:bg-white/6"
          onClick={() => {
            if (onBack) {
              onBack();
              return;
            }
            goBackOrFallback(fallbackHref);
          }}
          type="button"
        >
          <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
            <path
              d="M14.5 6.5 9 12l5.5 5.5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          {isCompact ? (
            <h1 className="truncate text-base font-bold text-white">{title}</h1>
          ) : (
            <>
              <p className="truncate text-[0.65rem] font-medium text-zinc-500">{backLabel}</p>
              <h1 className="truncate text-sm font-bold text-white">{title}</h1>
            </>
          )}
        </div>

        {rightAction ? <div className="shrink-0">{rightAction}</div> : null}
      </div>
    </header>
  );
}
