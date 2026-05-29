"use client";

import Link from "next/link";
import { useExperiment } from "@/hooks/useExperiment";
import { trackExperimentConversion } from "@/lib/experiments/tracking";

export function LandingHeroExperiment() {
  const experiment = useExperiment("landing_hero_copy");
  const heroTitle =
    typeof experiment.payload.hero_title === "string"
      ? experiment.payload.hero_title
      : "Lướt truyện cuốn như TikTok";

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(255,255,255,0.03))] p-5 sm:p-6">
      <p className="page-kicker">ChapMee</p>
      <h1
        className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl"
        suppressHydrationWarning
      >
        {heroTitle}
      </h1>
      <p className="mt-3 max-w-2xl text-[0.98rem] leading-7 text-zinc-300">
        Đọc truyện ngắn, theo dõi tác giả, bình luận và vote hướng truyện ngay
        trên điện thoại.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-black text-zinc-950"
          href="/swipe"
          onClick={() =>
            trackExperimentConversion({
              experimentKey: "landing_hero_copy",
              variant: experiment.variant,
              conversionName: "landing_swipe_clicked"
            })
          }
        >
          Đọc ngay
        </Link>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-black text-white"
          href="/studio"
        >
          Trở thành tác giả
        </Link>
      </div>
    </section>
  );
}
