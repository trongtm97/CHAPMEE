import Link from "next/link";
import {
  analyticsBtnPrimary,
  analyticsCard
} from "@/components/studio/analytics/dashboard/shared/styles";
import { studioPath } from "@/lib/studio/constants";
import type { StudioAnalyticsCommunitySummary } from "@/types/studio-analytics";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

type CommunitySummarySectionProps = {
  community: StudioAnalyticsCommunitySummary;
};

export function CommunitySummarySection({ community }: CommunitySummarySectionProps) {
  return (
    <section className={`${analyticsCard} p-4`}>
      <h2 className="text-base font-bold text-white">Bình luận & cộng đồng</h2>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Mới" value={community.newComments} />
        <Stat label="Chưa trả lời" value={community.unreplied} warn />
        <Stat label="Báo cáo" value={community.reported} warn={community.reported > 0} />
      </div>

      {community.topStories.length > 0 ? (
        <ul className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Truyện nhiều bình luận
          </p>
          {community.topStories.slice(0, 3).map((story) => (
            <li key={story.storyId}>
              <Link
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm hover:border-white/20"
                href={story.href}
              >
                <span className="truncate font-medium text-zinc-200">{story.title}</span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {formatNumber(story.count)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link className={analyticsBtnPrimary} href={studioPath("/comments")}>
          Trả lời bình luận
        </Link>
        <Link
          className="inline-flex min-h-10 items-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-zinc-200 hover:bg-white/5"
          href="/community"
        >
          Xem cộng đồng
        </Link>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  warn = false
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-2 py-2 text-center ${
        warn && value > 0
          ? "border-amber-400/30 bg-amber-400/5"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p className="text-lg font-bold text-white">{formatNumber(value)}</p>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}
