import Link from "next/link";
import { Card } from "@/components/ui";
import type { FairnessDashboardData } from "@/lib/admin/fairness-dashboard-data";

type FairnessExposureDashboardProps = {
  data: FairnessDashboardData;
};

function warningBadge(level: string) {
  if (level === "critical") {
    return "border-red-400/40 bg-red-500/15 text-red-100";
  }
  if (level === "warn") {
    return "border-amber-400/40 bg-amber-500/15 text-amber-100";
  }
  return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
}

function StatCard({
  label,
  value,
  hint,
  alert
}: {
  label: string;
  value: string;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <Card
      className={`space-y-1 ${alert ? "border-amber-400/30 bg-amber-500/5" : ""}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-2xl font-black text-white">{value}</p>
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </Card>
  );
}

function SimpleShareBars({
  rows,
  labelKey
}: {
  rows: Array<{ label: string; sharePercent: number; impressions: number }>;
  labelKey?: string;
}) {
  void labelKey;
  const max = Math.max(1, ...rows.map((row) => row.sharePercent));
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex justify-between gap-2 text-xs">
            <span className="truncate text-zinc-300">{row.label}</span>
            <span className="shrink-0 text-zinc-500">
              {row.sharePercent.toFixed(1)}% · {row.impressions}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-cyan-400/70"
              style={{ width: `${(row.sharePercent / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FairnessExposureDashboard({ data }: FairnessExposureDashboardProps) {
  const reels =
    data.surfaces.find((surface) => surface.surface === "reels") ?? data.surfaces[0];
  const discover = data.surfaces.find((surface) => surface.surface === "discover");

  const top1AuthorAlert = (reels?.top1AuthorShare ?? 0) > data.thresholds.top1AuthorPercent;
  const top10StoryAlert = (reels?.top10StoryShare ?? 0) > data.thresholds.top10StoryPercent;
  const newAuthorLow =
    (reels?.newAuthorShare ?? 0) < data.thresholds.minNewAuthorPercent &&
    (reels?.totalImpressions ?? 0) > 50;
  const longTailLow =
    (reels?.longTailShare ?? 0) < data.thresholds.minLongTailPercent &&
    (reels?.totalImpressions ?? 0) > 50;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400">
            Snapshot {data.snapshotDate} · cửa sổ 7 ngày (live nếu chưa chạy cron)
          </p>
          {data.error ? (
            <p className="mt-2 text-sm text-red-300">{data.error}</p>
          ) : null}
        </div>
        <Link
          className="tap-highlight rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100"
          href="/admin/algorithm/ecosystem"
        >
          Ecosystem dashboard
        </Link>
        <Link
          className="tap-highlight rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:border-white/20"
          href="/admin/algorithm/fairness#fairness-settings"
        >
          Xem rule settings
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          alert={top1AuthorAlert}
          hint={`Ngưỡng cảnh báo ${data.thresholds.top1AuthorPercent}%`}
          label="Top 1% tác giả (Reels)"
          value={`${(reels?.top1AuthorShare ?? 0).toFixed(1)}%`}
        />
        <StatCard
          alert={top10StoryAlert}
          hint={`Ngưỡng cảnh báo ${data.thresholds.top10StoryPercent}%`}
          label="Top 10% truyện (Reels)"
          value={`${(reels?.top10StoryShare ?? 0).toFixed(1)}%`}
        />
        <StatCard
          label="Tác giả mới được test hôm nay"
          value={String(data.newAuthorsTestedToday)}
        />
        <StatCard
          label="Truyện mới được test hôm nay"
          value={String(data.newStoriesTestedToday)}
        />
        <StatCard
          alert={longTailLow}
          hint={`Tối thiểu khuyến nghị ${data.thresholds.minLongTailPercent}%`}
          label="Traffic long-tail (Reels)"
          value={`${(reels?.longTailShare ?? 0).toFixed(1)}%`}
        />
        <StatCard
          alert={newAuthorLow}
          hint={`Tối thiểu khuyến nghị ${data.thresholds.minNewAuthorPercent}%`}
          label="Traffic tác giả mới (Reels)"
          value={`${(reels?.newAuthorShare ?? 0).toFixed(1)}%`}
        />
        <StatCard
          label="Under-exposed share (Reels)"
          value={`${(reels?.underExposedShare ?? 0).toFixed(1)}%`}
        />
        <StatCard
          label="Gini tác giả / truyện"
          value={`${reels?.giniAuthor?.toFixed(2) ?? "—"} / ${reels?.giniStory?.toFixed(2) ?? "—"}`}
        />
      </div>

      {(top1AuthorAlert || top10StoryAlert || newAuthorLow || longTailLow) && (
        <Card className="border-amber-400/25 bg-amber-500/10">
          <p className="text-sm font-bold text-amber-100">Cảnh báo concentration</p>
          <ul className="mt-2 list-inside list-disc text-sm text-amber-100/90">
            {top1AuthorAlert ? (
              <li>Top 1% tác giả vượt ngưỡng — feed có thể bị vài tác giả chiếm slot.</li>
            ) : null}
            {top10StoryAlert ? (
              <li>Top 10% truyện vượt ngưỡng — một nhóm truyện hot đang hút impression.</li>
            ) : null}
            {newAuthorLow ? (
              <li>Exposure tác giả mới thấp — tăng quota new_author hoặc giảm cap hot author.</li>
            ) : null}
            {longTailLow ? (
              <li>Long-tail exposure thấp — kiểm tra long_tail pool và boost settings.</li>
            ) : null}
          </ul>
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="text-base font-black text-white">Surface breakdown (7d)</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase text-zinc-500">
                <th className="py-2 pr-4">Surface</th>
                <th className="py-2 pr-4">Impressions</th>
                <th className="py-2 pr-4">Top1% author</th>
                <th className="py-2 pr-4">Top10% story</th>
                <th className="py-2 pr-4">New author</th>
                <th className="py-2 pr-4">Long-tail</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.surfaces.map((row) => (
                <tr className="border-b border-white/5" key={row.surface}>
                  <td className="py-3 pr-4 font-semibold capitalize text-white">
                    {row.surface}
                  </td>
                  <td className="py-3 pr-4 text-zinc-300">{row.totalImpressions}</td>
                  <td className="py-3 pr-4 text-zinc-300">
                    {row.top1AuthorShare.toFixed(1)}%
                  </td>
                  <td className="py-3 pr-4 text-zinc-300">
                    {row.top10StoryShare.toFixed(1)}%
                  </td>
                  <td className="py-3 pr-4 text-zinc-300">
                    {row.newAuthorShare.toFixed(1)}%
                  </td>
                  <td className="py-3 pr-4 text-zinc-300">
                    {row.longTailShare.toFixed(1)}%
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-bold ${warningBadge(row.warningLevel)}`}
                    >
                      {row.warningLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {discover ? (
          <p className="text-xs text-zinc-500">
            Discover: top1 author {discover.top1AuthorShare.toFixed(1)}% · new author{" "}
            {discover.newAuthorShare.toFixed(1)}%
          </p>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-base font-black text-white">Top authors by exposure (Reels 7d)</h2>
          {data.topAuthors.length === 0 ? (
            <p className="text-sm text-zinc-500">Chưa có dữ liệu exposure.</p>
          ) : (
            <>
              <SimpleShareBars rows={data.topAuthors} />
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase text-zinc-500">
                    <th className="py-1">Tác giả</th>
                    <th className="py-1 text-right">Impressions</th>
                    <th className="py-1 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topAuthors.map((row) => (
                    <tr className="border-t border-white/5" key={row.id}>
                      <td className="py-2 text-zinc-200">{row.label}</td>
                      <td className="py-2 text-right text-zinc-400">{row.impressions}</td>
                      <td className="py-2 text-right text-zinc-400">
                        {row.sharePercent.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>

        <Card className="space-y-4">
          <h2 className="text-base font-black text-white">Top stories by exposure (Reels 7d)</h2>
          {data.topStories.length === 0 ? (
            <p className="text-sm text-zinc-500">Chưa có dữ liệu exposure.</p>
          ) : (
            <>
              <SimpleShareBars rows={data.topStories} />
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase text-zinc-500">
                    <th className="py-1">Truyện</th>
                    <th className="py-1 text-right">Impressions</th>
                    <th className="py-1 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topStories.map((row) => (
                    <tr className="border-t border-white/5" key={row.id}>
                      <td className="py-2 text-zinc-200">{row.label}</td>
                      <td className="py-2 text-right text-zinc-400">{row.impressions}</td>
                      <td className="py-2 text-right text-zinc-400">
                        {row.sharePercent.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="text-base font-black text-white">Fairness adjustments gần đây</h2>
        {data.recentAdjustments.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Chưa có log — sẽ xuất hiện khi feed áp dụng cap/boost.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase text-zinc-500">
                  <th className="py-2 pr-3">Thời gian</th>
                  <th className="py-2 pr-3">Surface</th>
                  <th className="py-2 pr-3">Loại</th>
                  <th className="py-2 pr-3">Score</th>
                  <th className="py-2">Lý do</th>
                </tr>
              </thead>
              <tbody>
                {data.recentAdjustments.map((row) => (
                  <tr className="border-b border-white/5" key={row.id}>
                    <td className="py-2 pr-3 text-xs text-zinc-500">
                      {new Date(row.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="py-2 pr-3 text-zinc-300">{row.surface}</td>
                    <td className="py-2 pr-3 text-zinc-300">{row.adjustmentType}</td>
                    <td className="py-2 pr-3 text-zinc-300">
                      {row.oldScore.toFixed(3)} → {row.newScore.toFixed(3)}
                    </td>
                    <td className="py-2 text-zinc-400">{row.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
