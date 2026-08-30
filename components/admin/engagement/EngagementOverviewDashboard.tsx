import Link from "next/link";
import type { EngagementOverviewStats } from "@/types/admin-engagement";

const QUICK_LINKS = [
  { href: "/admin/engagement/reactions", label: "Cảm xúc chương" },
  { href: "/admin/engagement/reviews", label: "Đánh giá truyện" },
  { href: "/admin/engagement/inline-comments", label: "Bình luận đoạn" },
  { href: "/admin/engagement/recommendation-tickets", label: "Phiếu đề cử" },
  { href: "/admin/engagement/boosts", label: "Đề cử (legacy)" },
  { href: "/admin/security/crawl-protection", label: "Chống crawl" }
] as const;

type EngagementOverviewDashboardProps = {
  stats: EngagementOverviewStats;
};

function StatCard({
  label,
  value,
  sub
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-zinc-100">{value}</p>
      {sub ? <p className="mt-1 text-xs text-zinc-500">{sub}</p> : null}
    </div>
  );
}

export function EngagementOverviewDashboard({ stats }: EngagementOverviewDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Phản ứng hôm nay" sub={`7 ngày: ${stats.reactions7d}`} value={stats.reactionsToday} />
        <StatCard
          label="Đánh giá cần xử lý"
          sub={`Có báo cáo: ${stats.reviewsReported}`}
          value={stats.reviewsPending}
        />
        <StatCard
          label="Bình luận đoạn"
          sub={`Báo cáo: ${stats.inlineCommentsReported} · Mồ côi: ${stats.inlineThreadsOrphaned}`}
          value={stats.inlineCommentsReported}
        />
        <StatCard
          label="Điểm đề cử hôm nay"
          sub={`7 ngày: ${stats.boostPoints7d}`}
          value={stats.boostPointsToday}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">
            Top đề cử (7 ngày)
          </h2>
          {stats.topBoostedStories.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Chưa có dữ liệu.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats.topBoostedStories.map((story) => (
                <li className="flex items-center justify-between gap-2 text-sm" key={story.storyId}>
                  <Link
                    className="truncate font-semibold text-cyan-300 hover:text-cyan-200"
                    href={`/truyen/${story.storySlug}`}
                  >
                    {story.storyTitle}
                  </Link>
                  <span className="shrink-0 text-zinc-500">+{story.totalBoostPoints}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">
            Bảo mật hôm nay
          </h2>
          <p className="mt-3 text-3xl font-bold text-zinc-100">{stats.securityEventsToday}</p>
          <p className="mt-1 text-sm text-zinc-500">Sự kiện rate limit / crawl / challenge</p>
          <Link
            className="mt-4 inline-block text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            href="/admin/security/crawl-protection"
          >
            Mở chống crawl →
          </Link>
        </section>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Truy cập nhanh</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_LINKS.map((link) => (
            <Link
              className="rounded-full border border-white/10 px-3 py-1.5 text-sm font-semibold text-zinc-200 hover:bg-white/[0.04]"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
