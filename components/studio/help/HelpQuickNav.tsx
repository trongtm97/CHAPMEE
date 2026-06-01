"use client";

import type { HelpQuickNavItem } from "@/lib/content/studio-help";

type HelpQuickNavProps = {
  items: HelpQuickNavItem[];
};

export function HelpQuickNav({ items }: HelpQuickNavProps) {
  return (
    <nav aria-label="Mục lục nhanh" className="space-y-3">
      <p className="text-sm font-semibold text-zinc-200">Mục lục nhanh</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {items.map((item) => (
          <a
            className="inline-flex shrink-0 min-h-10 items-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-xs font-semibold text-zinc-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            href={`#${item.sectionId}`}
            key={item.id}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
