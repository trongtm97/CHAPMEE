"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { studioPath } from "@/lib/studio/constants";
import {
  commentsBtnPrimary,
  commentsBtnSecondary
} from "@/components/studio/comments/shared/styles";
import type { StudioCommentStats } from "@/types/comments";

type StudioCommentsHeaderProps = {
  stats: StudioCommentStats;
};

export function StudioCommentsHeader({ stats }: StudioCommentsHeaderProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="text-xs text-zinc-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link className="transition hover:text-zinc-300" href={studioPath()}>
              Studio
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-zinc-400">Bình luận</li>
        </ol>
      </nav>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-black text-white sm:text-2xl">Bình luận</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
            Theo dõi, phản hồi và quản lý bình luận quanh truyện của bạn.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className={commentsBtnSecondary}
            onClick={() => router.refresh()}
            type="button"
          >
            Làm mới
          </button>
          <Link className={commentsBtnSecondary} href="/community">
            Mở trang cộng đồng
          </Link>
          <Link className={commentsBtnPrimary} href={studioPath("/stories")}>
            Xem truyện của tôi
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Bình luận mới" tone="cyan" value={stats.newRecent} />
        <StatCard label="Chưa trả lời" tone="amber" value={stats.unreplied} />
        <StatCard label="Bị báo cáo" tone="red" value={stats.reported} />
        <StatCard label="Đã ghim" tone="violet" value={stats.pinned} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  tone,
  value
}: {
  label: string;
  tone: "cyan" | "amber" | "red" | "violet";
  value: number;
}) {
  const toneClass = {
    cyan: "border-cyan-400/25 bg-cyan-400/5 text-cyan-100",
    amber: "border-amber-400/25 bg-amber-400/5 text-amber-100",
    red: "border-red-400/25 bg-red-400/5 text-red-200",
    violet: "border-violet-400/25 bg-violet-400/5 text-violet-100"
  }[tone];

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${toneClass}`}>
      <p className="text-[11px] font-medium text-zinc-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{value.toLocaleString("vi-VN")}</p>
    </div>
  );
}
