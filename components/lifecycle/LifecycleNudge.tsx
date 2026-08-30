"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { LifecycleNudgeConfig, LifecycleNudgeKey } from "@/types/lifecycle";

type LifecycleNudgeProps = {
  nudge: LifecycleNudgeConfig | null;
  onShown: (nudgeKey: LifecycleNudgeKey) => Promise<void>;
  onDismiss: (nudgeKey: LifecycleNudgeKey) => Promise<void>;
};

export function LifecycleNudge({ nudge, onShown, onDismiss }: LifecycleNudgeProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!nudge) {
      return;
    }
    startTransition(() => {
      void onShown(nudge.key);
    });
  }, [nudge, onShown]);

  if (!nudge || isHidden) {
    return null;
  }

  return (
    <div className="relative rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-4">
      <button
        aria-label="Đóng gợi ý"
        className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm text-zinc-200 transition hover:bg-white/20 disabled:opacity-60"
        disabled={isPending}
        onClick={() => {
          setIsHidden(true);
          startTransition(() => {
            void onDismiss(nudge.key);
          });
        }}
        type="button"
      >
        x
      </button>
      <p className="pr-10 text-base font-black text-white">{nudge.title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-200">{nudge.description}</p>
      <Link
        className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black text-zinc-950"
        href={nudge.ctaHref}
      >
        {nudge.ctaLabel}
      </Link>
    </div>
  );
}
