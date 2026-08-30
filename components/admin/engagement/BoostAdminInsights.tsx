import Link from "next/link";
import {
  getRecentStoryBoosts,
  getSuspiciousHighVolumeBoosters,
  getTopBoostedStories,
  getTopBoosters
} from "@/lib/boost/boost-admin-insights";

export async function BoostAdminInsights() {
  const [recent, topStories, topBoosters, suspicious] = await Promise.all([
    getRecentStoryBoosts(15),
    getTopBoostedStories(8),
    getTopBoosters(8),
    getSuspiciousHighVolumeBoosters(5)
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h2 className="text-lg font-bold text-zinc-100">Đề cử gần đây</h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Chưa có giao dịch đề cử.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {recent.map((row) => (
              <li className="py-2.5 text-sm" key={row.id}>
                <span className="font-semibold text-zinc-200">{row.storyTitle}</span>
                <span className="text-zinc-500">
                  {" "}
                  · +{row.boostPoints} boost · {row.amountSpent} điểm ·{" "}
                  {row.displayName ?? row.username ?? row.userId.slice(0, 8)}
                </span>
                {row.message ? (
                  <p className="mt-0.5 text-xs italic text-zinc-500">&ldquo;{row.message}&rdquo;</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-lg font-bold text-zinc-100">Top truyện (7 ngày)</h2>
          <ul className="mt-3 space-y-2">
            {topStories.map((story) => (
              <li className="flex items-center justify-between gap-2 text-sm" key={story.storyId}>
                <Link
                  className="truncate font-semibold text-cyan-300 hover:text-cyan-200"
                  href={`/truyen/${story.storySlug}`}
                >
                  {story.storyTitle}
                </Link>
                <span className="shrink-0 text-zinc-500">
                  {story.totalBoostPoints} · {story.uniqueBoosters} người
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-lg font-bold text-zinc-100">Top người đề cử (7 ngày)</h2>
          <ul className="mt-3 space-y-2">
            {topBoosters.map((booster) => (
              <li className="flex items-center justify-between gap-2 text-sm" key={booster.userId}>
                <span className="truncate text-zinc-200">
                  {booster.displayName ?? booster.username ?? booster.userId.slice(0, 8)}
                </span>
                <span className="shrink-0 text-zinc-500">
                  {booster.totalBoostPoints} · {booster.boostCount} lần
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {suspicious.length > 0 ? (
        <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
          <h2 className="text-lg font-bold text-amber-200">Cần xem xét (≥5 lần/ngày)</h2>
          <ul className="mt-3 space-y-2">
            {suspicious.map((row) => (
              <li className="text-sm text-amber-100/90" key={row.userId}>
                {row.displayName ?? row.username ?? row.userId} — {row.boostCount} lần hôm nay (
                {row.totalBoostPoints} boost)
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
