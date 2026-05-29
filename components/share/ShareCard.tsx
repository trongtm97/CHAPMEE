"use client";

import { Badge } from "@/components/ui";
import { ShareAchievementCard } from "@/components/share/ShareAchievementCard";
import { ShareProfileCard } from "@/components/share/ShareProfileCard";
import type { ShareCardPayload } from "@/types/share";

type ShareCardProps = {
  payload: ShareCardPayload;
};

function ShareMedia({
  backgroundUrl,
  coverUrl,
  kind
}: Pick<ShareCardPayload, "backgroundUrl" | "coverUrl" | "kind">) {
  const imageUrl = backgroundUrl ?? coverUrl ?? null;

  return (
    <div className="absolute inset-0">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-full w-full object-cover"
          src={imageUrl}
        />
      ) : (
        <div
          className={`h-full w-full ${kind === "swipe" ? "bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.2),transparent_28%),linear-gradient(180deg,#0a1220,#05070d)]" : "bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.18),transparent_28%),linear-gradient(180deg,#101a28,#05070d)]"}`}
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,12,0.12)_0%,rgba(5,8,12,0.45)_46%,rgba(5,8,12,0.92)_100%)]" />
    </div>
  );
}

export function ShareCard({ payload }: ShareCardProps) {
  if (payload.kind === "profile") {
    return <ShareProfileCard payload={payload} />;
  }

  if (payload.kind === "achievement") {
    return <ShareAchievementCard payload={payload} />;
  }

  const bodyText =
    payload.kind === "swipe"
      ? payload.excerpt ?? payload.text
      : payload.hook ?? payload.text;

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--surface)] shadow-[0_24px_50px_rgba(0,0,0,0.32)]">
      <div className="relative aspect-[9/16] overflow-hidden">
        <ShareMedia
          backgroundUrl={payload.backgroundUrl}
          coverUrl={payload.coverUrl}
          kind={payload.kind}
        />

        <div className="absolute left-5 right-5 top-5 flex items-center justify-between gap-3">
          <Badge className="bg-black/24 text-[0.62rem] text-white backdrop-blur-md">
            ChapMee
          </Badge>
          <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[0.64rem] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
            {payload.kind === "swipe" ? "Swipe excerpt" : "Story share"}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <div className="space-y-3 rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,10,15,0.28),rgba(7,10,15,0.78))] p-4 backdrop-blur-md">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">
              {payload.kind === "swipe"
                ? "Lướt truyện này trên ChapMee"
                : "Đọc tiếp trên ChapMee"}
            </p>
            <h2 className="text-balance text-[1.75rem] font-black leading-[1.04] text-white">
              {payload.title}
            </h2>
            {payload.authorName ? (
              <p className="text-sm font-medium text-zinc-300">
                {payload.authorName}
              </p>
            ) : null}
            {payload.genreName ? (
              <div className="flex flex-wrap gap-2">
                <Badge>{payload.genreName}</Badge>
              </div>
            ) : null}
            {bodyText ? (
              <p className="line-clamp-5 text-[0.96rem] leading-7 text-zinc-100">
                {bodyText}
              </p>
            ) : null}
            {payload.stats?.length ? (
              <div className="grid grid-cols-2 gap-2">
                {payload.stats.slice(0, 2).map((stat) => (
                  <div
                    className="rounded-2xl border border-white/10 bg-white/[0.05] p-3"
                    key={stat.label}
                  >
                    <p className="text-[0.64rem] font-bold uppercase tracking-[0.18em] text-zinc-400">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-lg font-black text-white">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-sm font-semibold text-zinc-200">
                {payload.ctaLabel ??
                  (payload.kind === "swipe"
                    ? "Lướt truyện này trên ChapMee"
                    : "Đọc tiếp trên ChapMee")}
              </span>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                ChapMee
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
