import Link from "next/link";
import type { MediaHubStats } from "@/lib/media/media-hub-data";
import { mediaTabHref } from "@/lib/media/media-tabs";

type MediaHeroProps = {
  stats: MediaHubStats;
  activeTab: "audio" | "video";
};

export function MediaHero({ stats, activeTab }: MediaHeroProps) {
  const hasStats = stats.audioCount > 0 || stats.videoCount > 0 || stats.storiesWithMediaCount > 0;

  return (
    <header className="space-y-3 rounded-xl border border-white/[0.08] bg-[#0a1017]/90 px-4 py-3.5 sm:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Media</h1>
          <p className="max-w-lg text-sm leading-relaxed text-zinc-400">
            Nghe audio truyện và xem video chuyển thể từ các tác phẩm trên ChapMee.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "audio"
                ? "bg-cyan-300/20 text-cyan-100 ring-1 ring-cyan-300/30"
                : "border border-white/15 text-zinc-200 hover:bg-white/5"
            }`}
            href={mediaTabHref("audio", { page: "1" })}
          >
            Nghe audio
          </Link>
          <Link
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "video"
                ? "bg-cyan-300/20 text-cyan-100 ring-1 ring-cyan-300/30"
                : "border border-white/15 text-zinc-200 hover:bg-white/5"
            }`}
            href={mediaTabHref("video", { page: "1" })}
          >
            Xem video
          </Link>
        </div>
      </div>

      {hasStats ? (
        <dl className="flex flex-wrap gap-4 text-xs sm:gap-5">
          <div>
            <dt className="text-zinc-500">Audio truyện</dt>
            <dd className="font-bold text-zinc-200">{stats.audioCount.toLocaleString("vi-VN")}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Video chuyển thể</dt>
            <dd className="font-bold text-zinc-200">{stats.videoCount.toLocaleString("vi-VN")}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Tác phẩm</dt>
            <dd className="font-bold text-zinc-200">
              {stats.storiesWithMediaCount.toLocaleString("vi-VN")}
            </dd>
          </div>
        </dl>
      ) : null}
    </header>
  );
}
