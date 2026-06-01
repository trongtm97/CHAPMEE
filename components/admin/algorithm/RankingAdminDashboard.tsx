"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { regenerateRankingSnapshotsAction } from "@/lib/admin/ranking-dashboard-actions";
import type { RankingAdminDashboardData } from "@/lib/admin/ranking-dashboard-data";

type RankingAdminDashboardProps = {
  data: RankingAdminDashboardData;
};

const BOARD_LABELS: Record<string, string> = {
  top_stories: "Top truyện",
  new_stories: "Truyện mới",
  new_authors: "Tác giả mới",
  genre_stories: "Theo thể loại",
  completed_stories: "Hoàn thành",
  rising_stories: "Đang lên",
  reels_read_through: "Reels kéo đọc",
  most_saved: "Lưu nhiều",
  chapter_next_rate: "Đọc tiếp cao",
  long_tail_quality: "Giữ chân tốt"
};

const WINDOW_LABELS: Record<string, string> = {
  day: "Ngày",
  week: "Tuần",
  month: "Tháng",
  all_time: "Tổng"
};

export function RankingAdminDashboard({ data }: RankingAdminDashboardProps) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">Bảng xếp hạng</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Snapshot precomputed — công thức cân bằng, không dựa đơn thuần view.
          </p>
          {data.lastRegeneratedAt ? (
            <p className="mt-2 text-xs text-zinc-500">
              Snapshot gần nhất: {formatTime(data.lastRegeneratedAt)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 disabled:opacity-50"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await regenerateRankingSnapshotsAction();
                window.location.reload();
              })
            }
            type="button"
          >
            {pending ? "Đang tạo snapshot…" : "Tạo lại snapshot"}
          </button>
          <Link
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:border-white/20"
            href="/admin/algorithm?tab=ranking"
          >
            Chỉnh trọng số
          </Link>
        </div>
      </div>

      {data.error ? (
        <Card className="border-amber-400/30 bg-amber-500/5 text-amber-100">
          {data.error}
        </Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WeightCard label="Hoàn thành chương" value={data.weights.completion} />
        <WeightCard label="Đọc chương tiếp" value={data.weights.nextChapter} />
        <WeightCard label="Lưu truyện" value={data.weights.save} />
        <WeightCard label="Theo dõi tác giả" value={data.weights.follow} />
        <WeightCard label="Mở khóa trả phí" value={data.weights.unlock} />
        <WeightCard label="Độ mới" value={data.weights.freshness} />
        <WeightCard label="Công bằng hiển thị" value={data.weights.fairness} />
        <StatCard
          label="Max slot / tác giả (top 20)"
          value={String(data.weights.maxSameAuthorTopSlots)}
        />
      </section>

      <Card className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-3 py-3">Loại bảng</th>
              <th className="px-3 py-3">Cửa sổ</th>
              <th className="px-3 py-3">Thể loại</th>
              <th className="px-3 py-3">Snapshot cuối</th>
              <th className="px-3 py-3">Số mục</th>
              <th className="px-3 py-3">Top concentration</th>
            </tr>
          </thead>
          <tbody>
            {data.boards.map((board) => (
              <tr className="border-b border-white/5" key={`${board.boardType}-${board.timeWindow}-${board.genreId ?? "all"}`}>
                <td className="px-3 py-3 font-medium text-white">
                  {BOARD_LABELS[board.boardType] ?? board.boardType}
                </td>
                <td className="px-3 py-3 text-zinc-300">
                  {WINDOW_LABELS[board.timeWindow] ?? board.timeWindow}
                </td>
                <td className="px-3 py-3 text-zinc-400">{board.genreName ?? "—"}</td>
                <td className="px-3 py-3 text-zinc-400">
                  {board.lastSnapshotAt ? formatTime(board.lastSnapshotAt) : "Chưa có"}
                </td>
                <td className="px-3 py-3 text-zinc-300">{board.itemCount}</td>
                <td className="px-3 py-3">
                  <ConcentrationBadge value={board.topConcentrationPercent} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function WeightCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-2xl font-black text-white">{Math.round(value * 100)}%</p>
    </Card>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-2xl font-black text-white">{value}</p>
    </Card>
  );
}

function ConcentrationBadge({ value }: { value: number }) {
  const tone =
    value >= 50
      ? "border-red-400/30 bg-red-500/10 text-red-100"
      : value >= 35
        ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
        : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${tone}`}>
      {value.toFixed(0)}% top10
    </span>
  );
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}
