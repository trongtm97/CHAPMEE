import Link from "next/link";
import type { ReactNode } from "react";
import { CONTENT_HUB_HERO_CTAS } from "@/lib/content-posts/public-catalog";

type ContentPostHeroProps = {
  searchSlot?: ReactNode;
};

export function ContentPostHero({ searchSlot }: ContentPostHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900/80 to-cyan-950/30 p-5 sm:p-6 md:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 left-1/3 h-28 w-28 rounded-full bg-pink-400/10 blur-2xl"
      />
      <div className="relative space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-zinc-50 md:text-3xl">Bài viết</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-[0.9375rem]">
            Cập nhật hướng dẫn, mẹo đọc truyện và kinh nghiệm dùng ChapMee cho cả người đọc lẫn
            tác giả.
          </p>
        </div>
        {searchSlot ?? null}
        <nav
          aria-label="Chủ đề nhanh"
          className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5"
        >
          {CONTENT_HUB_HERO_CTAS.map((cta) => (
            <Link
              className="shrink-0 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-cyan-300/35 hover:bg-cyan-400/10 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              href={cta.href}
              key={cta.href}
            >
              {cta.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
