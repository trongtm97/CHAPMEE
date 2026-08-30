"use client";

import { HeaderSearchButton } from "@/components/navigation/HeaderSearchButton";

const iconButtonClass =
  "tap-highlight flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:border-cyan-300/25 hover:text-cyan-100";

export function MobileTopBarSearch() {
  return <HeaderSearchButton className={iconButtonClass} mobileLayout />;
}
