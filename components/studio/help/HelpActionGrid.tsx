"use client";

import Link from "next/link";
import type { HelpActionCard } from "@/lib/content/studio-help";

type HelpActionGridProps = {
  cards: HelpActionCard[];
  title?: string;
  compact?: boolean;
};

export function HelpActionGrid({ cards, compact = false, title = "Bạn muốn làm gì?" }: HelpActionGridProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
        {cards.map((card) => (
          <Link
            className="group flex min-h-[7.5rem] flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-cyan-300/30 hover:bg-cyan-400/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            href={card.href}
            key={card.id}
          >
            <div>
              <p className="font-semibold text-zinc-100 group-hover:text-white">{card.title}</p>
              <p className="mt-1.5 text-sm leading-6 text-zinc-500">{card.description}</p>
            </div>
            <span className="mt-3 text-xs font-semibold text-cyan-300">Mở →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
